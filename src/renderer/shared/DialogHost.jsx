import { useEffect, useState } from 'react'
import { api } from './hooks.js'

/**
 * Fenêtres de dialogue d'Helios (erreurs de lancement, installation de
 * Java…), redessinées ici. Le contenu vient d'overlay.js (évènement
 * cobblemon:overlay) ; les boutons cliquent les vrais boutons cachés
 * d'Helios, dont les gestionnaires font la suite.
 */
export default function DialogHost() {
    const [dialog, setDialog] = useState(() => api()?.dialog?.getState?.() ?? { open: false })

    useEffect(() => api()?.dialog?.onChange?.((d) => setDialog({ ...d })), [])

    useEffect(() => {
        if (!dialog.open) return
        const onKey = (e) => {
            if (e.key === 'Enter') api()?.dialog?.acknowledge?.()
            else if (e.key === 'Escape' && dialog.dismissable) api()?.dialog?.dismiss?.()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [dialog])

    if (!dialog.open) return null
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm pointer-events-auto font-avenir text-cf-text animate-[fadeIn_.15s_ease-out]">
            <div role="dialog" aria-modal="true" className="cf-panel w-[min(460px,90vw)] p-7 shadow-2xl">
                <h2 className="font-avenirHeavy text-xl leading-snug" dangerouslySetInnerHTML={{ __html: dialog.title }} />
                <div className="mt-3 text-sm leading-relaxed text-cf-textDim [&_a]:cf-link" dangerouslySetInnerHTML={{ __html: dialog.description }} />
                <div className="mt-6 flex justify-end gap-3">
                    {dialog.dismissable && (
                        <button onClick={() => api()?.dialog?.dismiss?.()} className="cf-btn-secondary px-5 py-2.5 text-sm" dangerouslySetInnerHTML={{ __html: dialog.dismiss }} />
                    )}
                    <button autoFocus onClick={() => api()?.dialog?.acknowledge?.()} className="cf-btn-primary px-5 py-2.5 text-sm" dangerouslySetInnerHTML={{ __html: dialog.acknowledge }} />
                </div>
            </div>
        </div>
    )
}
