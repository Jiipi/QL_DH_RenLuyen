import React from 'react';

export default function Card(props){
  const { children, className } = props;
  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className||''}`}>
      {children}
    </div>
  );
}

