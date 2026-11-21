import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export default function Dialog({open,onClose,title,children,className=''}:{open:boolean;onClose:()=>void;title:string;children:ReactNode;className?:string}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const d=ref.current!;if(open&&!d.open)d.showModal();else if(!open&&d.open)d.close();},[open]);
  return <dialog ref={ref} className={`store-dialog ${className}`} onClose={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}} aria-label={title}><div className="dialog-content"><div className="dialog-heading"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label={`Close ${title}`}><X size={21}/></button></div>{children}</div></dialog>;
}
