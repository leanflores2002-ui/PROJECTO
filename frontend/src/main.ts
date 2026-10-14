import "./components/romix-toast.js";
import type { RomixToastOptions } from "./components/romix-toast.js";

declare global {
  interface Window {
    romixToast?: (message: string, options?: RomixToastOptions) => void;
  }
}

window.romixToast = (message, options) => {
  document.querySelector("romix-toast")?.show(message, options);
};

export {};
