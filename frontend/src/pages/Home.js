import React from 'react';

export default function Home() {
	return React.createElement(
		'div',
		{ className: 'p-6' },
		[
			React.createElement('h2', { key: 'h', className: 'text-xl font-semibold' }, 'Home'),
			React.createElement('p', { key: 'p', className: 'text-gray-600 mt-1' }, 'Welcome to the app.'),
		]
	);
}


