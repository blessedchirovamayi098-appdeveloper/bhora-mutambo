
import { useState } from "react";
import "./FarewellOverlay.css";

export default function FarewellOverlay() {
    const [visible, setVisible] = useState(true);

    if (!visible) return null;

    return (
        <section
            className="farewell-cover"
            role="dialog"
            aria-modal="true"
            aria-labelledby="farewell-title"
        >
            <div className="farewell-cover__inner">

                {/* Header */}
                <header className="farewell-cover__header">
                    <span></span>
                    <p>KANA ZVIRI NYORE ITAWO</p>
                    <span></span>
                </header>

                {/* Main heading */}
                <div className="farewell-cover__heading">
                    <h1 id="farewell-title">
                        BHORA MUTAMBO
                        <strong>VANA BHUDHI </strong>
                    </h1>

                    <p className="farewell-cover__message">
                        Ndinokutendai nenguva yatakatamba tese.
                    </p>
                </div>

                {/* Team photograph and video */}
                <div className="farewell-cover__grid">

                    {/* Team photograph */}
                    <div className="farewell-cover__team">
                        <figure className="farewell-cover__photo">
                            <img
                                src="/farewell.jpeg"
                                alt="Manav Rachna football team"
                            />
                        </figure>

                        <h2 className="farewell-cover__team-caption">
                            Tese tinoziva kuti
                            <strong>shasha maPart 2</strong>
                        </h2>
                    </div>

                    {/* YouTube video */}
                    <div className="farewell-cover__video">
                        <div className="farewell-cover__video-heading">
                            <span aria-hidden="true">▶</span>
                            Chimbotererai Baba
                        </div>

                        <div className="farewell-cover__video-frame">
                            <iframe
                                src="https://www.youtube.com/embed/DF_BdqbDjik?si=GDf0dB8cRQCCviK2"
                                title="Bhora Mutambo football memories"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                referrerPolicy="strict-origin-when-cross-origin"
                                allowFullScreen
                            />
                        </div>
                    </div>

                </div>

                {/* Closing message */}
                <div className="farewell-cover__closing">
                    <span></span>
                    <p>
                        Mutambo unopera, asi ndangariro dzinoramba dziripo.
                    </p>
                    <span></span>
                </div>

                {/* Continue to football hub */}
                <button
                    className="farewell-cover__button"
                    type="button"
                    onClick={() => setVisible(false)}
                >
                    Ndozvakaita Nature
                    <span aria-hidden="true">→</span>
                </button>

                {/* Footer */}
                <footer className="farewell-cover__footer">
                    <span></span>
                    ONE GAME · MANY MEMORIES · ONE FAMILY
                    <span></span>
                </footer>

            </div>
        </section>
    );
}
