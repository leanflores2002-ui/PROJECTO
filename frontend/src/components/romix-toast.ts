export type RomixToastType = "default" | "success" | "error";

export interface RomixToastOptions {
  type?: RomixToastType;
  duration?: number;
}

const TOAST_TAG = "romix-toast";
const DEFAULT_DURATION = 3200;

export class RomixToast extends HTMLElement {
  private hideTimer: number | undefined;
  private messageElement: HTMLSpanElement | undefined;

  connectedCallback(): void {
    this.classList.add("romix-toast");
    this.setAttribute("aria-atomic", "true");
    this.hidden = true;
    this.ensureMessageElement();
  }

  show(message: string, options: RomixToastOptions = {}): void {
    this.ensureMessageElement();

    const type: RomixToastType = options.type ?? "default";
    const duration = Number.isFinite(options.duration) && (options.duration ?? 0) >= 0
      ? options.duration ?? DEFAULT_DURATION
      : DEFAULT_DURATION;

    this.classList.toggle("romix-toast--success", type === "success");
    this.classList.toggle("romix-toast--error", type === "error");
    this.setAttribute("role", type === "error" ? "alert" : "status");
    this.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
    this.messageElement!.textContent = message;
    this.hidden = false;

    if (duration === 0) {
      this.hide();
      return;
    }

    this.classList.remove("is-visible");
    window.requestAnimationFrame(() => this.classList.add("is-visible"));

    if (this.hideTimer !== undefined) window.clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => this.hide(), duration);
  }

  hide(): void {
    if (this.hideTimer !== undefined) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = undefined;
    }
    this.classList.remove("is-visible");
    this.hidden = true;
  }

  private ensureMessageElement(): void {
    if (this.messageElement) return;

    const messageElement = document.createElement("span");
    messageElement.className = "romix-toast__message";
    this.appendChild(messageElement);
    this.messageElement = messageElement;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "romix-toast": RomixToast;
  }
}

if (!customElements.get(TOAST_TAG)) {
  customElements.define(TOAST_TAG, RomixToast);
}
