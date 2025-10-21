#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STACK_NAME="student-app-stack"
REGION="${AWS_REGION:-ap-southeast-1}"
KEY_NAME="student-app-key"
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.medium}"
VOLUME_SIZE="${VOLUME_SIZE:-30}"
ALLOWED_SSH_IP="${ALLOWED_SSH_IP:-0.0.0.0/0}"

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if AWS CLI is installed
check_aws_cli() {
    print_info "Checking AWS CLI installation..."
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        echo "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        exit 1
    fi
    print_success "AWS CLI is installed: $(aws --version)"
}

# Check AWS credentials
check_aws_credentials() {
    print_info "Checking AWS credentials..."
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials are not configured properly."
        echo "Run: aws configure"
        exit 1
    fi
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    print_success "AWS credentials configured for account: $ACCOUNT_ID"
}

# Create EC2 Key Pair
create_key_pair() {
    print_info "Creating EC2 Key Pair: $KEY_NAME"
    
    if aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region "$REGION" &> /dev/null; then
        print_warning "Key pair '$KEY_NAME' already exists. Skipping creation."
        return
    fi
    
    aws ec2 create-key-pair \
        --key-name "$KEY_NAME" \
        --region "$REGION" \
        --query 'KeyMaterial' \
        --output text > "${KEY_NAME}.pem"
    
    chmod 400 "${KEY_NAME}.pem"
    print_success "Key pair created and saved to ${KEY_NAME}.pem"
    print_warning "⚠️  IMPORTANT: Keep this file safe! You cannot download it again."
}

# Deploy CloudFormation stack
deploy_stack() {
    print_info "Deploying CloudFormation stack: $STACK_NAME"
    
    TEMPLATE_FILE="../cloudformation/ec2-infrastructure.yml"
    
    if [ ! -f "$TEMPLATE_FILE" ]; then
        print_error "CloudFormation template not found: $TEMPLATE_FILE"
        exit 1
    fi
    
    # Check if stack exists
    if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &> /dev/null; then
        print_info "Stack already exists. Updating..."
        
        aws cloudformation update-stack \
            --stack-name "$STACK_NAME" \
            --region "$REGION" \
            --template-body "file://$TEMPLATE_FILE" \
            --parameters \
                ParameterKey=KeyPairName,ParameterValue="$KEY_NAME" \
                ParameterKey=InstanceType,ParameterValue="$INSTANCE_TYPE" \
                ParameterKey=VolumeSize,ParameterValue="$VOLUME_SIZE" \
                ParameterKey=AllowedSSHIP,ParameterValue="$ALLOWED_SSH_IP" \
            --capabilities CAPABILITY_IAM || {
                print_warning "No updates to be performed or update failed"
                return
            }
        
        print_info "Waiting for stack update to complete..."
        aws cloudformation wait stack-update-complete \
            --stack-name "$STACK_NAME" \
            --region "$REGION"
    else
        print_info "Creating new stack..."
        
        aws cloudformation create-stack \
            --stack-name "$STACK_NAME" \
            --region "$REGION" \
            --template-body "file://$TEMPLATE_FILE" \
            --parameters \
                ParameterKey=KeyPairName,ParameterValue="$KEY_NAME" \
                ParameterKey=InstanceType,ParameterValue="$INSTANCE_TYPE" \
                ParameterKey=VolumeSize,ParameterValue="$VOLUME_SIZE" \
                ParameterKey=AllowedSSHIP,ParameterValue="$ALLOWED_SSH_IP" \
            --capabilities CAPABILITY_IAM
        
        print_info "Waiting for stack creation to complete (this may take 5-10 minutes)..."
        aws cloudformation wait stack-create-complete \
            --stack-name "$STACK_NAME" \
            --region "$REGION"
    fi
    
    print_success "Stack deployed successfully!"
}

# Get stack outputs
get_stack_outputs() {
    print_info "Retrieving stack outputs..."
    
    OUTPUTS=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs' \
        --output json)
    
    PUBLIC_IP=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="PublicIP") | .OutputValue')
    INSTANCE_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="InstanceId") | .OutputValue')
    APP_URL=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="ApplicationURL") | .OutputValue')
    API_URL=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="APIURL") | .OutputValue')
    
    echo ""
    print_success "=== DEPLOYMENT INFORMATION ==="
    echo ""
    echo "Instance ID:      $INSTANCE_ID"
    echo "Public IP:        $PUBLIC_IP"
    echo "Application URL:  $APP_URL"
    echo "API URL:          $API_URL"
    echo ""
    echo "SSH Command:      ssh -i ${KEY_NAME}.pem ec2-user@$PUBLIC_IP"
    echo ""
    
    # Save to file for later use
    cat > stack-info.txt << EOF
STACK_NAME=$STACK_NAME
REGION=$REGION
INSTANCE_ID=$INSTANCE_ID
PUBLIC_IP=$PUBLIC_IP
APP_URL=$APP_URL
API_URL=$API_URL
SSH_COMMAND=ssh -i ${KEY_NAME}.pem ec2-user@$PUBLIC_IP
EOF
    
    print_success "Stack information saved to stack-info.txt"
}

# Test SSH connection
test_ssh_connection() {
    print_info "Testing SSH connection..."
    
    if [ ! -f "${KEY_NAME}.pem" ]; then
        print_error "Key file ${KEY_NAME}.pem not found"
        return 1
    fi
    
    source stack-info.txt
    
    print_info "Waiting for instance to be ready (SSH may take a minute)..."
    sleep 30
    
    if ssh -i "${KEY_NAME}.pem" \
        -o StrictHostKeyChecking=no \
        -o ConnectTimeout=10 \
        ec2-user@"$PUBLIC_IP" \
        "echo 'SSH connection successful'" 2>/dev/null; then
        print_success "SSH connection test successful!"
        return 0
    else
        print_warning "SSH connection test failed. The instance may still be initializing."
        print_info "Try again in a few minutes with: ssh -i ${KEY_NAME}.pem ec2-user@$PUBLIC_IP"
        return 1
    fi
}

# Main execution
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║   AWS Infrastructure Setup for Student Activity System    ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    print_info "Configuration:"
    echo "  Region:           $REGION"
    echo "  Stack Name:       $STACK_NAME"
    echo "  Key Name:         $KEY_NAME"
    echo "  Instance Type:    $INSTANCE_TYPE"
    echo "  Volume Size:      ${VOLUME_SIZE}GB"
    echo "  Allowed SSH IP:   $ALLOWED_SSH_IP"
    echo ""
    
    read -p "Continue with this configuration? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Setup cancelled"
        exit 0
    fi
    
    check_aws_cli
    check_aws_credentials
    create_key_pair
    deploy_stack
    get_stack_outputs
    test_ssh_connection
    
    echo ""
    print_success "=== SETUP COMPLETE ==="
    echo ""
    print_info "Next steps:"
    echo "  1. SSH into your instance: ssh -i ${KEY_NAME}.pem ec2-user@\$PUBLIC_IP"
    echo "  2. Clone your repository on the instance"
    echo "  3. Run the deployment script"
    echo ""
    print_warning "Don't forget to:"
    echo "  - Configure GitHub Secrets for CI/CD"
    echo "  - Setup DNS (if using custom domain)"
    echo "  - Configure SSL certificates"
    echo "  - Setup monitoring and backups"
    echo ""
}

# Run main function
main "$@"
