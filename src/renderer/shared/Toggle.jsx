/** Interrupteur on/off accessible (bouton avec aria-pressed). */
export default function Toggle({ checked, onChange, disabled = false, label }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={
                'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ' +
                (checked ? 'bg-cf-accent' : 'bg-white/20') +
                (disabled ? ' opacity-50 cursor-not-allowed' : ' cursor-pointer')
            }
        >
            <span className={'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ' + (checked ? 'translate-x-6' : 'translate-x-1')} />
        </button>
    )
}
