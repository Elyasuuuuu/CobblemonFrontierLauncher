import { useCallback, useEffect, useRef, useState } from 'react'
import Backdrop from '../shared/Backdrop.jsx'
import TitleBar from '../shared/TitleBar.jsx'
import { api, useAccount, useWindowEvent } from '../shared/hooks.js'

const USERNAME = /^[A-Za-z0-9_]{1,16}$/

function Steps({ step }) {
    const order = ['welcome', 'pseudo', 'skin']
    const index = order.indexOf(step)
    return (
        <div className="flex items-center justify-center gap-2 mb-6">
            {order.map((s, i) => (
                <span key={s} className={'h-1.5 rounded-full transition-all duration-300 ' + (i <= index ? 'w-8 bg-cf-orange' : 'w-4 bg-white/25')} />
            ))}
        </div>
    )
}

function Welcome({ onNext }) {
    return (
        <div className="text-center">
            <img src="assets/images/SealCircle.png" className="w-24 h-24 mx-auto rounded-full shadow-[0_8px_40px_rgba(155,92,246,0.5)]" />
            <h1 className="mt-6 font-avenirHeavy text-3xl text-white">
                Bienvenue sur <span className="text-cf-accentLight">Cobblemon Frontier</span>
            </h1>
            <p className="mt-4 text-cf-text/80 leading-relaxed">
                Une aventure Pokémon en monde ouvert : explore le continent de Thalorn, capture et entraîne ton équipe,
                puis fonde ta ville et fais-la grandir avec les autres joueurs.
            </p>
            <button onClick={onNext} className="cf-btn-primary mt-8 px-10 py-3.5 text-base">
                Commencer
            </button>
        </div>
    )
}

function MicrosoftLogin({ onDone }) {
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    const login = async () => {
        if (busy) return
        setBusy(true)
        setError('')
        try {
            await api()?.account?.loginMicrosoft?.()
            onDone()
        } catch (err) {
            setError(err.message)
            setBusy(false)
        }
    }

    return (
        <div>
            <button type="button" onClick={login} disabled={busy}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-white text-[#1b1b1b] font-avenirHeavy text-base shadow-lg hover:bg-white/90 transition-colors disabled:opacity-60 disabled:pointer-events-none">
                <svg width="20" height="20" viewBox="0 0 21 21" aria-hidden="true">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022" /><rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" /><rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                </svg>
                {busy ? 'Connexion en cours…' : 'Se connecter avec Microsoft'}
            </button>
            <p className={'mt-2 text-xs text-center min-h-[1rem] ' + (error ? 'text-[#ff8a80]' : 'text-cf-textDim')}>
                {error || 'Le compte Microsoft sur lequel tu as acheté Minecraft.'}
            </p>
        </div>
    )
}

function Pseudo({ onDone, seul }) {
    const [name, setName] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const input = useRef(null)
    useEffect(() => { if (seul) input.current?.focus() }, [seul])

    const valid = USERNAME.test(name)
    const submit = async (e) => {
        e.preventDefault()
        if (!valid || busy) return
        setBusy(true)
        setError('')
        try {
            await api()?.account?.create?.(name)
            onDone()
        } catch (err) {
            setError(err.message)
            setBusy(false)
        }
    }

    return (
        <form onSubmit={submit}>
            <input
                ref={input}
                value={name}
                onChange={(e) => { setName(e.target.value); setError('') }}
                maxLength={16}
                spellCheck={false}
                placeholder="Pseudo"
                className="cf-input text-center text-lg"
            />
            <p className={'mt-2 text-xs text-center min-h-[1rem] ' + (error || (name && !valid) ? 'text-[#ff8a80]' : 'text-cf-textDim')}>
                {error || (name && !valid ? '1 à 16 caractères : lettres, chiffres et _ uniquement.' : '1 à 16 caractères : lettres, chiffres et _')}
            </p>
            <div className="mt-4 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-xs text-cf-text/75 leading-relaxed">
                À ta première connexion au serveur, tu choisiras un mot de passe avec <span className="text-white font-avenirMedium">/register</span> : il protège ton pseudo.
                Ensuite, <span className="text-white font-avenirMedium">/login</span> à chaque connexion.
            </div>
            <button type="submit" disabled={!valid || busy} className={(seul ? 'cf-btn-primary' : 'cf-btn-secondary') + ' w-full mt-6 py-3 text-base disabled:opacity-50 disabled:pointer-events-none'}>
                {busy ? 'Un instant…' : seul ? 'Continuer' : 'Jouer avec ce pseudo'}
            </button>
        </form>
    )
}

/** Connexion : compte Microsoft et/ou pseudo, selon ce que ce launcher accepte (ipcconstants.AUTH_MODES). */
function Connexion({ onDone }) {
    const modes = api()?.account?.modes?.() ?? ['pseudo']
    const microsoft = modes.includes('microsoft')
    const pseudo = modes.includes('pseudo')
    return (
        <div>
            <h1 className="font-avenirHeavy text-2xl text-white text-center">{microsoft ? 'Connecte-toi' : 'Choisis ton pseudo'}</h1>
            <p className="mt-2 mb-6 text-sm text-cf-text/75 text-center">
                {microsoft ? 'Ton pseudo en jeu est celui de ton compte Minecraft.' : "C'est ton nom en jeu, visible par les autres joueurs."}
            </p>
            {microsoft && <MicrosoftLogin onDone={onDone} />}
            {microsoft && pseudo && (
                <div className="flex items-center gap-3 my-5 text-xs text-cf-textDim">
                    <span className="flex-1 h-px bg-white/15" />ou, sur le serveur de test<span className="flex-1 h-px bg-white/15" />
                </div>
            )}
            {pseudo && <Pseudo onDone={onDone} seul={!microsoft} />}
        </div>
    )
}

function Skin({ onDone }) {
    const account = useAccount()
    const [mode, setMode] = useState('copy')
    const [name, setName] = useState('')
    const [file, setFile] = useState(null)
    const [message, setMessage] = useState(null)
    const [busy, setBusy] = useState(false)
    const fileInput = useRef(null)

    const run = async (action) => {
        setBusy(true)
        setMessage(null)
        try {
            await action()
            setMessage({ ok: true, text: 'Skin enregistré ! Il sera appliqué à ta prochaine connexion au serveur.' })
            setTimeout(onDone, 1600)
        } catch (err) {
            setMessage({ ok: false, text: "Impossible d'appliquer ce skin (" + err.message + ')' })
            setBusy(false)
        }
    }

    const tab = (id, label) => (
        <button
            type="button"
            onClick={() => { setMode(id); setMessage(null) }}
            className={'flex-1 py-2 rounded-lg text-sm font-avenirMedium transition-colors ' + (mode === id ? 'bg-white/15 text-white' : 'text-cf-text/70 hover:text-white')}
        >
            {label}
        </button>
    )

    return (
        <div>
            <h1 className="font-avenirHeavy text-2xl text-white text-center">Choisis ton skin</h1>
            <p className="mt-2 text-sm text-cf-text/75 text-center">
                Facultatif{account ? <> pour <span className="text-white">{account.displayName}</span></> : null} : tu pourras le changer plus tard depuis le menu du compte.
            </p>
            <div className="mt-6 flex gap-1 p-1 rounded-xl bg-black/30 border border-white/10">
                {tab('copy', 'Copier un compte Minecraft')}
                {tab('upload', 'Envoyer une image')}
            </div>
            {mode === 'copy' ? (
                <form className="mt-4" onSubmit={(e) => { e.preventDefault(); if (USERNAME.test(name)) run(() => api().skin.copyFrom(name)) }}>
                    <input value={name} onChange={(e) => setName(e.target.value)} maxLength={16} spellCheck={false} placeholder="Pseudo d'un compte Minecraft" className="cf-input" />
                    <button type="submit" disabled={!USERNAME.test(name) || busy} className="cf-btn-primary w-full mt-3 py-3 disabled:opacity-50 disabled:pointer-events-none">
                        {busy ? 'Envoi…' : 'Copier ce skin'}
                    </button>
                </form>
            ) : (
                <div className="mt-4">
                    <input ref={fileInput} type="file" accept="image/png" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                    <button type="button" onClick={() => fileInput.current?.click()} className="cf-input text-left truncate">
                        {file ? file.name : 'Choisir une image PNG (64×64)…'}
                    </button>
                    <button type="button" disabled={!file || busy} onClick={() => run(() => api().skin.upload(file))} className="cf-btn-primary w-full mt-3 py-3 disabled:opacity-50 disabled:pointer-events-none">
                        {busy ? 'Envoi…' : 'Envoyer ce skin'}
                    </button>
                </div>
            )}
            <p className={'mt-3 text-sm text-center min-h-[1.25rem] ' + (message == null ? '' : message.ok ? 'text-cf-green' : 'text-[#ff8a80]')}>
                {message?.text}
            </p>
            <button type="button" onClick={onDone} className="block mx-auto mt-2 text-sm text-cf-text/70 hover:text-white transition-colors">
                Passer pour l'instant
            </button>
        </div>
    )
}

/**
 * Premier lancement : bienvenue, connexion (compte Microsoft et/ou pseudo), skin. Aussi rouvert sur une étape
 * précise depuis le menu du compte (changer de skin, après déconnexion).
 */
export default function OnboardingApp() {
    const account = useAccount()
    const [step, setStep] = useState(() => (account ? 'skin' : 'welcome'))
    const [returnToApp, setReturnToApp] = useState(false)

    useWindowEvent('cobblemon:onboarding', useCallback((detail) => {
        setStep(detail?.step ?? 'welcome')
        setReturnToApp(detail?.step === 'skin')
    }, []))

    const finish = () => {
        api()?.nav?.showLanding?.()
        setTimeout(() => { setStep(api()?.account?.getSelected?.() ? 'skin' : 'welcome'); setReturnToApp(false) }, 600)
    }

    return (
        <div className="relative w-full h-full flex flex-col font-avenir text-cf-text overflow-hidden">
            <Backdrop blurred />
            <TitleBar>
                {returnToApp && (
                    <button onClick={finish} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                        ← Retour
                    </button>
                )}
            </TitleBar>
            <div className="relative flex-1 flex items-center justify-center px-6 pb-14">
                <div key={step} className="cf-panel w-[min(460px,100%)] px-9 py-9 shadow-2xl animate-[fadeIn_.25s_ease-out]">
                    {!returnToApp && <Steps step={step} />}
                    {step === 'welcome' && <Welcome onNext={() => setStep('pseudo')} />}
                    {step === 'pseudo' && <Connexion onDone={() => setStep('skin')} />}
                    {step === 'skin' && <Skin onDone={finish} />}
                </div>
            </div>
        </div>
    )
}
