# Frontend (CRA, no Vite)

- React 19, React Router, Tailwind CSS v3, Zustand, Axios
- No JSX: components use `React.createElement`
- CRA (react-scripts 5)

## Cấu trúc thư mục

```
frontend/
  ├─ public/
  ├─ src/
  │  ├─ assets/
  │  ├─ components/
  │  │  └─ Header.js
  │  ├─ context/
  │  ├─ hooks/
  │  ├─ pages/
  │  │  └─ Home.js
  │  ├─ services/
  │  │  └─ http.js
  │  ├─ store/
  │  │  └─ useAppStore.js
  │  ├─ styles/
  │  ├─ utils/
  │  ├─ App.js
  │  ├─ index.css
  │  └─ index.js
  ├─ postcss.config.js
  ├─ tailwind.config.js
  └─ README.md
```

## Không dùng JSX

- Ví dụ `Home.js`:
```js
import React from 'react';
export default function Home() {
	return React.createElement('div', { className: 'p-6' }, [
		React.createElement('h2', { key: 'h', className: 'text-xl font-semibold' }, 'Home'),
		React.createElement('p', { key: 'p', className: 'text-gray-600 mt-1' }, 'Welcome to the app.'),
	]);
}
```

## Tailwind CSS (v3)

- `postcss.config.js`:
```js
module.exports = {
	plugins: {
		tailwindcss: {},
		autoprefixer: {},
	},
};
```

- `tailwind.config.js` đã trỏ tới `./public/index.html` và `./src/**/*.{js,jsx,ts,tsx}`.
- `src/index.css` chứa:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Scripts

- npm start – chạy dev server tại http://localhost:3000
- npm run build – build production vào thư mục `build`

## Ghi chú

- Router được cấu hình trong `App.js` với `BrowserRouter`, `Routes`, `Route` bằng `React.createElement`.
- API client: `src/services/http.js` (Axios, `REACT_APP_API_URL`).
