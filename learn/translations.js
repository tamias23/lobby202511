const translations = {
    en: {
        menu: {
            intro: "Introduction",
            setup_phase: "Setup Phase",
            board: "The Board & Topology",
            turn: "Turn Mechanics",
            goddess: "Goddess",
            heroe: "Heroe",
            mage: "Mage",
            siren: "Siren",
            ghoul: "Ghoul",
            soldier: "Soldier & Berserker",
            global_overview: "Global Overview"
        },
        sections: {
            intro: {
                title: "Introduction",
                content: `
                    <div class="card">
                        <h2 style="margin-top: 0">The Goal</h2>
                        <p>The primary objective is to <span class="accent">capture the opponent's Goddess</span>. The game ends immediately when a Goddess is removed from the board.</p>
                    </div>
                    <p>Two sides compete: <span class="accent">White</span> and <span class="accent">Black</span>. White starts at the top of the board, and Black starts at the bottom. White moves first by selecting a starting color.</p>
                    <p>Strategy involves managing your piece's lifecycle: from the reserve to the battlefield, and potentially back to being "returned" if captured.</p>
                `
            },
            setup_phase: {
                title: "Setup Phase",
                content: `
                    <p>Before the "Playing" phase begins, players must position their core forces. Placement is strictly regulated in 5 steps:</p>
                    <ol class="setup-steps">
                        <li>
                            <h3 class="accent">1. The Goddess</h3>
                            <p>Must be placed on the <span class="highlight">far edge</span> of your side of the board.</p>
                        </li>
                        <li>
                            <h3 class="accent">2. The Heroes</h3>
                            <p>Placed on edges, between 3 and 6 jumps away from the Goddess, and at least 6 jumps away from each other.</p>
                        </li>
                        <li>
                            <h3 class="accent">3. The Protectors</h3>
                            <p><span class="accent">Berserkers</span> are placed as close as possible to the Goddess to form a defensive shell.</p>
                        </li>
                        <li>
                            <h3 class="accent">4. The Chromatic Ring</h3>
                            <p><span class="accent">Bishops</span> are distributed on 4 unique colors as near as possible to your anchor pieces.</p>
                        </li>
                        <li>
                            <h3 class="accent">5. Infantry Deployment</h3>
                            <p><span class="accent">Ghouls</span> and <span class="accent">Sirens</span> fill the remaining tactical positions as close as possible to your anchor pieces.</p>
                        </li>
                    </ol>
                    <div class="card" style="margin-top: 2rem">
                        <p><i>Note: <span class="accent">Mages</span> and <span class="accent">Soldiers</span> always start in the "Returned" reserve and are deployed during active play.</i></p>
                    </div>
                `
            },
            board: {
                title: "Board & Topology",
                content: `
                    <p>The board is a network of polygons where movement depends on how they are connected.</p>
                    <div class="card">
                        <h3><span class="accent">Walking</span> (Slide)</h3>
                        <p>Pieces move from one Polygon to the next, between Polygons that share an edge. <span class="highlight">Red Edges block walking</span>.</p>
                    </div>
                    <div class="card">
                        <h3><span class="accent">Jumping</span></h3>
                        <p>Pieces "leap" over edges, ignoring both (possible) intermediate polygons and <span class="highlight">Red Edges</span>.</p>
                    </div>
                    <div class="card" style="border-color: #ef4444;">
                        <h3 style="color: #ef4444;">The Red Edge</h3>
                        <p>These thick red borders are <span class="accent">impassable walls</span> for walking pieces. Only jumpers can bypass these boundaries.</p>
                    </div>
                `
            },
            turn: {
                title: "Turn Mechanics",
                content: `
                    <div class="card">
                        <h3>1. Choose Color</h3>
                        <p>Select one of the colors that allows at least one legal move.</p>
                    </div>
                    <div class="card">
                        <h3>2. Activate Piece</h3>
                        <p>Any piece matching the chosen color can move. Also, pieces in the Graveyard (returned) can be deployed.</p>
                    </div>
                    <div class="card">
                        <h3>3. Turn End</h3>
                        <p>If your piece ends its movement on your <span class="highlight">chosen color</span>, your turn ends. Land on a different color to keep moving another piece in the ame turn.</p>
                    </div>
                `
            },
            goddess: {
                title: "The Goddess",
                content: `
                    <p>The Goddess is the most vital piece on the board. Protecting her is the highest priority.</p>
                    <div class="card">
                        <h3>Type: <span class="accent">Jumper</span></h3>
                        <p>Movement: <span class="highlight">Jump Range 2</span>. She leaps over obstacles with grace but limited speed.</p>
                    </div>
                    <p>If your Goddess is captured, the game ends instantly. She is often protected by Berserkers in the early game.</p>
                `
            },
            heroe: {
                title: "The Heroe",
                content: `
                    <p>Elite warriors with unmatched mobility and strike potential.</p>
                    <div class="card">
                        <h3>Type: <span class="accent">Jumper</span></h3>
                        <p>Movement: <span class="highlight">Jump Range 3</span>. Allows for deep strikes into enemy territory.</p>
                    </div>
                    <div class="card">
                        <h3>Special: <span class="accent">Bonus Jump</span></h3>
                        <p>Capturing an enemy allows the Heroe to jump <span class="highlight">immediately again</span>, potentially for a second strike, or a tactical retreat.</p>
                    </div>
                `
            },
            mage: {
                title: "The Mage",
                content: `
                    <p>Arcane mastery allows the Mage to control the battlefield through blasts and portals.</p>
                    <div class="card">
                        <h3>Type: <span class="accent">Jumper</span></h3>
                        <p>Movement: <span class="highlight">Jump Range 3</span>. <span class="accent">Must change color</span> every jump.</p>
                    </div>
                    <div class="card">
                        <h3>Special: <span class="accent">AoE Blast</span></h3>
                        <p>Upon capture, the Mage unleashes energy that <span class="accent">capture</span> all adjacent enemies. She can also assist "returned" pieces by providing a landing spot adjacent to her.</p>
                    </div>
                `
            },
            siren: {
                title: "The Siren",
                content: `
                    <p>A pacifist with a paralyzing aura. She cannot capture pieces but can disable them.</p>
                    <div class="card">
                        <h3>Type: <span class="accent">Jumper</span></h3>
                        <p>Movement: <span class="highlight">Jump Range 2</span>.</p>
                    </div>
                    <div class="card">
                        <h3>Special: <span class="accent">The Pin</span></h3>
                        <p>Enemy pieces <span class="highlight">adjacent</span> to the Siren are "pinned" and cannot move. This is a powerful defensive tool.</p>
                    </div>
                `
            },
            ghoul: {
                title: "The Ghoul",
                content: `
                    <p>Relentless infantry that crawls through the battlefield.</p>
                    <div class="card">
                        <h3>Type: <span class="accent">Walker</span></h3>
                        <p>Movement: <span class="highlight">Walk Range 2</span>. Must follow shared edges and is blocked by <span class="accent">Red Edges</span>.</p>
                    </div>
                    <p>Ghouls are numerous and effective at screening enemy jumpers or forming chains with Soldiers.</p>
                `
            },
            soldier: {
                title: "Soldier & Berserker",
                content: `
                    <p>The Phalanx: pieces that form long-range chains of movement.</p>
                    <div class="card">
                        <h3>Soldier (Walker)</h3>
                        <p>Moves via <span class="accent">Walking</span> to an adjacent polygon. Has the ability to continue walking when landing on the chosen color or a friendly unit, allowing further movement. Can also capture multiple ennemy units if they are on the chosen color.</p>
                    </div>
                    <div class="card">
                        <h3>Berserker (Walker)</h3>
                        <p>Identical to Soldiers but <span class="accent">Invulnerable</span>. They cannot be captured and act as immovable blocks.</p>
                    </div>
                    <p>Both are blocked by <span class="accent">Red Edges</span> and walk only one polygon away. But their special <span class="accent">Sliding</span> ability makes them the most dangerous pieces in the game.</p>
                `
            },
            global_overview: {
                title: "Global Overview",
                content: `
                    <p>This diagram represents a <span class="accent">complete starting board</span> after the Setup Phase. Note how the core anchors are distributed and the front lines are reinforced with infantry.</p>
                    <div class="card">
                        <h3>Final Positioning</h3>
                        <ul style="padding-left: 1.5rem; color: var(--text-secondary)">
                            <li>Goddesses protected by Berserkers.</li>
                            <li>Heroes positioned for early scouting.</li>
                            <li>Bishops spread across the color spectrum.</li>
                            <li>Sirens and Ghouls screening the advances.</li>
                        </ul>
                    </div>
                    <p>From this point, players begin the <span class="accent">Playing Phase</span> by selecting their first colors.</p>
                `
            }
        }
    },
    fr: {
        menu: {
            intro: "Introduction",
            setup_phase: "Phase de Placement",
            board: "Plateau & Topologie",
            turn: "Mécaniques de Tour",
            goddess: "Déesse",
            heroe: "Héros",
            mage: "Mage",
            siren: "Sirène",
            ghoul: "Goule",
            soldier: "Soldat & Berserker",
            global_overview: "Vue d'ensemble"
        },
        sections: {
            intro: {
                title: "Introduction",
                content: `
                    <div class="card">
                        <h2 style="margin-top: 0">Le But</h2>
                        <p>L'objectif principal est de <span class="accent">capturer la Déesse adverse</span>. La partie se termine immédiatement lorsqu'une Déesse est retirée du plateau.</p>
                    </div>
                    <p>Deux camps s'affrontent : <span class="accent">Blanc</span> et <span class="accent">Noir</span>. Blanc commence en haut du plateau, et Noir en bas. Blanc joue en premier en choisissant une couleur de départ.</p>
                    <p>La stratégie implique de gérer le cycle de vie de vos pièces : de la réserve au champ de bataille, et potentiellement retour à la réserve "capturée" si elles sont prises.</p>
                `
            },
            setup_phase: {
                title: "Phase de Placement",
                content: `
                    <p>Avant que la phase de "Jeu" ne commence, les joueurs doivent positionner leurs forces principales. Le placement est strictement réglementé en 5 étapes :</p>
                    <ol class="setup-steps">
                        <li>
                            <h3 class="accent">1. La Déesse</h3>
                            <p>Doit être placée sur le <span class="highlight">bord éloigné</span> de votre côté du plateau.</p>
                        </li>
                        <li>
                            <h3 class="accent">2. Les Héros</h3>
                            <p>Placés sur les bords, entre 3 et 6 sauts de la Déesse, et à au moins 6 sauts les uns des autres.</p>
                        </li>
                        <li>
                            <h3 class="accent">3. Les Protecteurs</h3>
                            <p>Les <span class="accent">Berserkers</span> sont placés aussi près que possible de la Déesse pour former une coque défensive.</p>
                        </li>
                        <li>
                            <h3 class="accent">4. L'Anneau Chromatique</h3>
                            <p>Les <span class="accent">Évêques</span> sont répartis sur 4 couleurs uniques aussi près que possible de vos pièces ancres.</p>
                        </li>
                        <li>
                            <h3 class="accent">5. Déploiement de l'Infanterie</h3>
                            <p>Les <span class="accent">Goules</span> et les <span class="accent">Sirènes</span> occupent les positions tactiques restantes aussi près que possible de vos pièces ancres.</p>
                        </li>
                    </ol>
                    <div class="card" style="margin-top: 2rem">
                        <p><i>Note : les <span class="accent">Mages</span> et les <span class="accent">Soldats</span> commencent toujours dans la réserve "Capturée" et sont déployés pendant le jeu actif.</i></p>
                    </div>
                `
            },
            board: {
                title: "Plateau & Topologie",
                content: `
                    <p>Le plateau est un réseau de polygones où le mouvement dépend de la façon dont ils sont connectés.</p>
                    <div class="card">
                        <h3><span class="accent">Marcher</span> (Glisser)</h3>
                        <p>Les pièces se déplacent d'un polygone à l'autre, entre des polygones partageant une arête. Les <span class="highlight">arêtes rouges bloquent la marche</span>.</p>
                    </div>
                    <div class="card">
                        <h3><span class="accent">Sauter</span></h3>
                        <p>Les pièces "bondissent" par-dessus les arêtes, ignorant les polygones intermédiaires (éventuels) et les <span class="highlight">arêtes rouges</span>.</p>
                    </div>
                    <div class="card" style="border-color: #ef4444;">
                        <h3 style="color: #ef4444;">L'arête Rouge</h3>
                        <p>Ces bordures rouges épaisses sont des <span class="accent">murs infranchissables</span> pour les pièces qui marchent. Seuls les sauteurs peuvent contourner ces limites.</p>
                    </div>
                `
            },
            turn: {
                title: "Mécaniques de Tour",
                content: `
                    <div class="card">
                        <h3>1. Choisir une Couleur</h3>
                        <p>Sélectionnez l'une des couleurs qui permet au moins un mouvement légal.</p>
                    </div>
                    <div class="card">
                        <h3>2. Activer une Pièce</h3>
                        <p>Toute pièce correspondant à la couleur choisie peut bouger. De plus, les pièces dans le cimetière (capturées) peuvent être déployées.</p>
                    </div>
                    <div class="card">
                        <h3>3. Fin du Tour</h3>
                        <p>Si votre pièce termine son mouvement sur votre <span class="highlight">couleur choisie</span>, votre tour se termine. Atterrissez sur une couleur différente pour continuer à déplacer une autre pièce dans le même tour.</p>
                    </div>
                `
            },
            goddess: {
                title: "La Déesse",
                content: `
                    <p>La Déesse est la pièce la plus vitale du plateau. La protéger est la priorité absolue.</p>
                    <div class="card">
                        <h3>Type : <span class="accent">Sauteur</span></h3>
                        <p>Mouvement : <span class="highlight">Portée de Saut 2</span>. Elle survole les obstacles avec grâce mais une vitesse limitée.</p>
                    </div>
                    <p>Si votre Déesse est capturée, la partie se termine instantanément. Elle est souvent protégée par des Berserkers en début de partie.</p>
                `
            },
            heroe: {
                title: "Le Héros",
                content: `
                    <p>Des guerriers d'élite avec une mobilité et un potentiel de frappe inégalés.</p>
                    <div class="card">
                        <h3>Type : <span class="accent">Sauteur</span></h3>
                        <p>Mouvement : <span class="highlight">Portée de Saut 3</span>. Permet des frappes profondes en territoire ennemi.</p>
                    </div>
                    <div class="card">
                        <h3>Spécial : <span class="accent">Saut Bonus</span></h3>
                        <p>Capturer un ennemi permet au Héros de sauter <span class="highlight">immédiatement à nouveau</span>, potentiellement pour une deuxième frappe ou une retraite tactique.</p>
                    </div>
                `
            },
            mage: {
                title: "Le Mage",
                content: `
                    <p>La maîtrise des arcanes permet au Mage de contrôler le champ de bataille via des explosions et des portails.</p>
                    <div class="card">
                        <h3>Type : <span class="accent">Sauteur</span></h3>
                        <p>Mouvement : <span class="highlight">Portée de Saut 3</span>. <span class="accent">Doit changer de couleur</span> à chaque saut.</p>
                    </div>
                    <div class="card">
                        <h3>Spécial : <span class="accent">Explosion de Zone</span></h3>
                        <p>Lors de sa capture, le Mage libère une énergie qui <span class="accent">capture</span> tous les ennemis adjacents. Il peut également aider les pièces "capturées" en fournissant un point d'atterrissage adjacent.</p>
                    </div>
                `
            },
            siren: {
                title: "La Sirène",
                content: `
                    <p>Une pacifiste avec une aura paralysante. Elle ne peut pas capturer de pièces mais peut les désactiver.</p>
                    <div class="card">
                        <h3>Type : <span class="accent">Sauteur</span></h3>
                        <p>Mouvement : <span class="highlight">Portée de Saut 2</span>.</p>
                    </div>
                    <div class="card">
                        <h3>Spécial : <span class="accent">Le Blocage</span></h3>
                        <p>Les pièces ennemies <span class="highlight">adjacentes</span> à la Sirène sont "clouées" et ne peuvent plus bouger. C'est un outil défensif puissant.</p>
                    </div>
                `
            },
            ghoul: {
                title: "La Goule",
                content: `
                    <p>Une infanterie implacable qui rampe sur le champ de bataille.</p>
                    <div class="card">
                        <h3>Type : <span class="accent">Marcheur</span></h3>
                        <p>Mouvement : <span class="highlight">Portée de Marche 2</span>. Doit suivre les arêtes partagées et est bloquée par les <span class="accent">Arêtes Rouges</span>.</p>
                    </div>
                    <p>Les Goules sont nombreuses et efficaces pour faire écran aux sauteurs ennemis ou former des chaînes avec les Soldats.</p>
                `
            },
            soldier: {
                title: "Soldat & Berserker",
                content: `
                    <p>La Phalange : des pièces qui forment des chaînes de mouvement à longue portée.</p>
                    <div class="card">
                        <h3>Soldat (Marcheur)</h3>
                        <p>Se déplace en <span class="accent">Marchant</span> vers un polygone adjacent. A la capacité de continuer à marcher s'il atterrit sur la couleur choisie ou une unité alliée, permettant un mouvement prolongé. Peut aussi capturer plusieurs unités ennemies si elles sont sur la couleur choisie.</p>
                    </div>
                    <div class="card">
                        <h3>Berserker (Marcheur)</h3>
                        <p>Identique aux Soldats mais <span class="accent">Invulnérable</span>. Ils ne peuvent pas être capturés et agissent comme des blocs inamovibles.</p>
                    </div>
                    <p>Les deux sont bloqués par les <span class="accent">Arêtes Rouges</span> et ne marchent qu'à un polygone de distance. Mais leur capacité spéciale de <span class="accent">Glissade</span> en fait les pièces les plus dangereuses du jeu.</p>
                `
            },
            global_overview: {
                title: "Vue d'ensemble",
                content: `
                    <p>Ce diagramme représente un <span class="accent">plateau de départ complet</span> après la Phase de Placement. Notez comment les ancres centrales sont réparties et les lignes de front renforcées par l'infanterie.</p>
                    <div class="card">
                        <h3>Positionnement Final</h3>
                        <ul style="padding-left: 1.5rem; color: var(--text-secondary)">
                            <li>Déesses protégées par des Berserkers.</li>
                            <li>Héros positionnés pour l'éclaireur précoce.</li>
                            <li>Évêques répartis sur le spectre des couleurs.</li>
                            <li>Sirènes et Goules protégeant les avancées.</li>
                        </ul>
                    </div>
                    <p>À partir de ce point, les joueurs commencent la <span class="accent">Phase de Jeu</span> en sélectionnant leurs premières couleurs.</p>
                `
            }
        }
    }
};
