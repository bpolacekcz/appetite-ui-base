// Why: the app entry Expo starts (package.json main); it registers App.tsx. No numbers.
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
