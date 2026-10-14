import { createContext, useContext, useRef, useState, useId, cloneElement } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';
import { Field, FieldLabel, FieldError } from './ui/field';
import { Skeleton } from './ui/skeleton';

const ConfirmContext = createContext(null);
// One controlled confirmation surface: initial focus is always on Cancelar.
export function ConfirmationProvider({ children }) {
  const [prompt, setPrompt] = useState(null);
  const pending = useRef(null);
  const origin = useRef(null);
  const confirm = (options) => new Promise((resolve) => {
    if (pending.current) pending.current(false);
    origin.current = document.activeElement;
    pending.current = resolve;
    setPrompt(options);
  });
  function finish(value) { pending.current?.(value); pending.current = null; setPrompt(null); }
  return <ConfirmContext.Provider value={confirm}>{children}
    <AlertDialog open={Boolean(prompt)} onOpenChange={(open) => { if (!open) finish(false); }}>
      <AlertDialogContent onCloseAutoFocus={(e) => { e.preventDefault(); if (origin.current?.isConnected) origin.current.focus(); }}>
        <AlertDialogHeader><AlertDialogTitle>{prompt?.title}</AlertDialogTitle><AlertDialogDescription>{prompt?.description}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel onClick={() => finish(false)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => finish(true)}>{prompt?.action || 'Continuar'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </ConfirmContext.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() { return useContext(ConfirmContext); }
export function FormField({ label, error, children, className }) {
  const id = useId();
  return <Field className={className} data-invalid={Boolean(error)}><FieldLabel htmlFor={id}>{label}</FieldLabel>
    {cloneElement(children, { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-error` : undefined })}
    {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
  </Field>;
}
export function Alert({ children }) { return children ? <p className="inline-alert inline-alert--error" role="alert">{children}</p> : null; }
export function Loading({ label = 'Cargando…' }) { return <div className="loading-skeleton" role="status" aria-label={label}><span>{label}</span>{[1,2,3].map(n => <Skeleton key={n} className="h-12 w-full" />)}</div>; }
