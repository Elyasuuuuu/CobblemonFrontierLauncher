import { useEffect, useRef } from 'react'

/**
 * Fond commun : l'image du serveur (nette ou floutée, floutage précalculé,
 * cf. .cf-app-bg-blurred), un léger effet de profondeur qui suit la souris,
 * et le voile violet qui garde le texte lisible par-dessus.
 */
export default function Backdrop({ blurred = false, parallax = true }) {
    const ref = useRef(null)
    useEffect(() => {
        const el = ref.current
        if (el == null) return
        el.style.transform = 'scale(1.08)'
        if (!parallax) return
        const strength = 18
        const onMove = (e) => {
            const nx = (e.clientX / window.innerWidth - 0.5) * 2
            const ny = (e.clientY / window.innerHeight - 0.5) * 2
            el.style.transform = `scale(1.08) translate(${(-nx * strength).toFixed(1)}px, ${(-ny * strength).toFixed(1)}px)`
        }
        window.addEventListener('mousemove', onMove)
        return () => window.removeEventListener('mousemove', onMove)
    }, [parallax])
    return (
        <>
            <div ref={ref} className={'absolute -inset-6 transition-transform duration-300 ease-out will-change-transform ' + (blurred ? 'cf-app-bg-blurred' : 'cf-app-bg')} />
            <div className="absolute inset-0 bg-cf-accent/55 mix-blend-multiply" />
            {blurred && <div className="absolute inset-0 bg-black/25" />}
        </>
    )
}
