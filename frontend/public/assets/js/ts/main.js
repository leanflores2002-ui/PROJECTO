import "./components/romix-toast.js";
window.romixToast = (message, options) => {
    document.querySelector("romix-toast")?.show(message, options);
};
