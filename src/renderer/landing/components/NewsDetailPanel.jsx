import { typeLabel, formatShortDate } from '../hooks/useNews.js'

/**
 * Minimal, hand-rolled renderer for the small markdown subset news.json
 * authors are expected to write by hand: '## ' headings, '- ' bullets
 * (optionally followed by an indented plain continuation line rendered as a
 * dimmer sub-line), inline **bold** and `code`, blank-line-separated
 * paragraphs. Not a general markdown parser -- just enough for the news
 * format, so the JSON stays easy to hand-edit without pulling in a library.
 */
function renderInline(text, keyPrefix) {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={`${keyPrefix}-${i}`} className="font-avenirMedium text-cf-text">{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={`${keyPrefix}-${i}`} className="bg-white/10 text-cf-accentLight px-1.5 py-0.5 rounded text-[13px] font-mono">{part.slice(1, -1)}</code>
        }
        return <span key={`${keyPrefix}-${i}`}>{part}</span>
    })
}

function renderBody(content) {
    const lines = (content || '').split('\n')
    const blocks = []
    let i = 0
    let paragraph = []

    const flushParagraph = () => {
        if (paragraph.length > 0) {
            blocks.push({ type: 'p', text: paragraph.join(' ') })
            paragraph = []
        }
    }

    while (i < lines.length) {
        const line = lines[i]
        if (line.trim() === '') {
            flushParagraph()
        } else if (line.startsWith('## ')) {
            flushParagraph()
            blocks.push({ type: 'h', text: line.slice(3).trim() })
        } else if (line.startsWith('- ')) {
            flushParagraph()
            const item = { text: line.slice(2).trim(), sub: null }
            if (lines[i + 1] && lines[i + 1].trim() !== '' && !lines[i + 1].startsWith('- ') && !lines[i + 1].startsWith('## ')) {
                item.sub = lines[i + 1].trim()
                i++
            }
            const last = blocks[blocks.length - 1]
            if (last && last.type === 'ul') {
                last.items.push(item)
            } else {
                blocks.push({ type: 'ul', items: [item] })
            }
        } else {
            paragraph.push(line.trim())
        }
        i++
    }
    flushParagraph()

    return blocks.map((block, i) => {
        if (block.type === 'h') {
            return <h3 key={i} className="font-avenirMedium text-lg text-cf-text mt-2">{block.text}</h3>
        }
        if (block.type === 'ul') {
            return (
                <ul key={i} className="flex flex-col gap-3">
                    {block.items.map((item, j) => (
                        <li key={j} className="flex flex-col gap-0.5">
                            <span className="text-[15px] text-cf-text">{renderInline(item.text, `${i}-${j}`)}</span>
                            {item.sub && <span className="text-sm text-cf-textDim">{renderInline(item.sub, `${i}-${j}-sub`)}</span>}
                        </li>
                    ))}
                </ul>
            )
        }
        return <p key={i} className="text-[15px] text-cf-textDim leading-relaxed">{renderInline(block.text, `p${i}`)}</p>
    })
}

export default function NewsDetailPanel({ article, gameName, onBack, onClose }) {
    if (article == null) return null

    return (
        <div className="absolute inset-0 z-20 flex justify-end">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative w-[45%] min-w-[420px] h-full bg-cf-panel flex flex-col overflow-y-auto">
                <div className="flex items-start justify-between p-6 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="cf-glass w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0">
                            <img src="assets/images/cbm.png" className="w-7 h-7 object-contain" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-avenirHeavy font-bold text-xl text-cf-text">Actualités</span>
                            <span className="text-sm text-cf-textDim">{gameName}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="cf-icon-btn w-9 h-9 flex-shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <line x1="6" y1="6" x2="18" y2="18" />
                            <line x1="18" y1="6" x2="6" y2="18" />
                        </svg>
                    </button>
                </div>

                <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-cf-textDim hover:text-cf-text px-6 pb-4 text-left w-fit transition-transform duration-150 hover:-translate-y-0.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Toutes les actualités
                </button>

                {article.image && (
                    <img src={article.image} className="w-full h-[220px] object-cover" />
                )}

                <div className="flex flex-col gap-4 p-6">
                    <div>
                        <div className="flex items-center gap-1.5 text-sm mb-2">
                            <span className={article.type === 'mise_a_jour' ? 'text-cf-green font-avenirMedium' : 'text-cf-text font-avenirMedium'}>
                                {typeLabel(article.type)}
                            </span>
                            <span className="text-cf-textDim">· {formatShortDate(article.date)}</span>
                        </div>
                        <h2 className="font-avenirHeavy font-bold text-2xl text-cf-text">{article.title}</h2>
                    </div>

                    <div className="flex flex-col gap-4">
                        {renderBody(article.content || article.excerpt)}
                    </div>
                </div>

                {article.link && (
                    <div className="mt-auto flex justify-end p-6 pt-4">
                        <button
                            onClick={() => window.cobblemonAPI?.shell?.openExternal?.(article.link)}
                            className="cf-btn-secondary text-sm px-4 py-2.5"
                        >
                            Voir sur Discord
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
