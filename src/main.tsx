import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import { Editor } from './editor';

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<div className="min-h-[100dvh] grid place-items-center">
			<Editor width={600} height={300} />
		</div>
	</React.StrictMode>
);
