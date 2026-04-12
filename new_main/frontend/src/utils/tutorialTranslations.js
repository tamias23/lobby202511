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
            witch: "Witch",
            soldier: "Soldier",
            minotaur: "Minotaur",
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
                            <p>Placed on edges, between <span class="highlight">4 and 6 jumps</span> away from the Goddess, and at least 6 jumps away from each other.</p>
                        </li>
                        <li>
                            <h3 class="accent">3. The Minotaurs</h3>
                            <p><span class="accent">Minotaurs</span> are placed within 1-2 jump-hops of the Goddess to form a defensive shell.</p>
                        </li>
                        <li>
                            <h3 class="accent">4. The Chromatic Ring</h3>
                            <p><span class="accent">Witchs</span> are distributed on 4 unique colors as near as possible to your anchor pieces.</p>
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
                    <p>If your Goddess is captured, the game ends instantly. She is often protected by Minotaurs in the early game.</p>
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
                        <h3>Special: <span class="accent">Chromatic Unlock</span></h3>
                        <p>The Mage is <span class="highlight">Locked</span> at the start. She only becomes available once all 4 board colors have been used as turn colors.</p>
                    </div>
                    <div class="card">
                        <h3>Ability: <span class="accent">Chain Attack</span></h3>
                        <p>Upon <span class="accent">successful capture</span>, the Mage unleashes energy that destroys all slide-adjacent enemies. She also enables "returned" pieces to land adjacent to her.</p>
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
                        <p>Enemy pieces <span class="highlight">slide-adjacent</span> to the Siren are "pinned" and cannot move. This is a powerful defensive tool.</p>
                    </div>
                `
            },
            ghoul: {
                title: "The Ghoul",
                content: `
                    <p>Relentless infantry that crawls through the battlefield.</p>
                    <div class="card">
                        <h3>Type: <span class="accent">Slider</span></h3>
                        <p>Movement: <span class="highlight">Slide Range 3</span>. Must follow shared edges and is blocked by <span class="accent">Red Edges</span>.</p>
                    </div>
                    <p>Ghouls are numerous and effective at screening enemy jumpers or forming chains with Soldiers. They can chain through empty, non-chosen-color polygons.</p>
                `
            },
            soldier: {
                title: "The Soldier",
                content: `
                    <p>The Phalanx: pieces that form long-range chains of movement.</p>
                    <div class="card">
                        <h3>Soldier (Slider)</h3>
                        <p>Moves via <span class="accent">Sliding</span> to an adjacent polygon. Has the ability to continue sliding when landing on the chosen color or a friendly unit, allowing further movement. Can also capture multiple enemy units if they are on the chosen color.</p>
                    </div>
                    <p>Soldiers are blocked by <span class="accent">Red Edges</span>. Their special <span class="accent">Sliding</span> ability makes them the most dangerous pieces in the game.</p>
                `
            },
            minotaur: {
                title: "The Minotaur",
                content: `
                    <p>The Unmovable Guard: ancient constructs that cannot be destroyed.</p>
                    <div class="card">
                        <h3>Minotaur (Slider)</h3>
                        <p>Identical to Soldiers but <span class="accent">Invulnerable</span>. They cannot be captured or targeted by AoE effects. They act as strategic obstacles that block enemy movement.</p>
                    </div>
                `
            },
            witch: {
                title: "The Witch",
                content: `
                    <p>Mystics that manipulate the chromatic essence of the board.</p>
                    <div class="card">
                        <h3>Type: <span class="accent">Jumper</span></h3>
                        <p>Movement: <span class="highlight">Jump Range 4</span>. <span class="accent">Must land on its starting color</span>.</p>
                    </div>
                    <div class="card">
                        <h3>Ability: <span class="accent">Landing Blast</span></h3>
                        <p>Upon landing on an empty polygon, the Witch destroys all enemy pieces <span class="accent">slide-adjacent</span> to her destination.</p>
                    </div>
                `
            },
            global_overview: {
                title: "Global Overview",
                content: `
                    <p>This diagram represents a <span class="accent">complete starting board</span> after the Setup Phase. Note how the core anchors are distributed and the front lines are reinforced with infantry.</p>
                    <div class="card">
                        <h3>Final Positioning</h3>
                        <ul style="padding-left: 1.5rem; color: var(--text-secondary)">
                            <li>Goddesses protected by Minotaurs.</li>
                            <li>Heroes positioned for early scouting.</li>
                            <li>Witchs spread across the color spectrum.</li>
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
            witch: "Sorcière",
            soldier: "Soldat",
            minotaur: "Minotaur",
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
                            <p>Placés sur les bords, entre <span class="highlight">4 et 6 sauts</span> de la Déesse, et à au moins 6 sauts les uns des autres.</p>
                        </li>
                        <li>
                            <h3 class="accent">3. Les Minotaurs</h3>
                            <p>Les <span class="accent">Minotaurs</span> sont placés à 1-2 sauts de la Déesse pour former une coque défensive.</p>
                        </li>
                        <li>
                            <h3 class="accent">4. L'Anneau Chromatique</h3>
                            <p>Les <span class="accent">Sorcières</span> sont réparties sur 4 couleurs uniques aussi près que possible de vos pièces ancres.</p>
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
                    <p>Si votre Déesse est capturée, la partie se termine instantanément. Elle est souvent protégée par des Minotaurs en début de partie.</p>
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
                        <h3>Spécial : <span class="accent">Déverrouillage Chromatique</span></h3>
                        <p>Le Mage est <span class="highlight">Verrouillé</span> au début. Il ne devient disponible qu'une fois que les 4 couleurs du plateau ont été utilisées.</p>
                    </div>
                    <div class="card">
                        <h3>Capacité : <span class="accent">Attaque en Chaîne</span></h3>
                        <p>Après une <span class="accent">capture réussie</span>, le Mage libère une énergie qui détruit tous les ennemis adjacents. Il permet aussi aux pièces capturées d'atterrir à côté de lui.</p>
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
                        <p>Les pièces ennemies <span class="highlight">adjacentes (glisse)</span> à la Sirène sont "clouées" et ne peuvent plus bouger. C'est un outil défensif puissant.</p>
                    </div>
                `
            },
            ghoul: {
                title: "La Goule",
                content: `
                    <p>Une infanterie implacable qui rampe sur le champ de bataille.</p>
                    <div class="card">
                        <h3>Type : <span class="accent">Glisseur</span></h3>
                        <p>Mouvement : <span class="highlight">Portée de Glissade 3</span>. Doit suivre les arêtes partagées et est bloquée par les <span class="accent">Arêtes Rouges</span>.</p>
                    </div>
                    <p>Les Goules sont nombreuses et efficaces pour faire écran aux sauteurs ennemis ou former des chaînes avec les Soldats. Elles peuvent traverser des polygones vides non-choisis.</p>
                `
            },
            soldier: {
                title: "Le Soldat",
                content: `
                    <p>La Phalange : des pièces qui forment des chaînes de mouvement à longue portée.</p>
                    <div class="card">
                        <h3>Soldat (Glisseur)</h3>
                        <p>Se déplace en <span class="accent">Glissant</span> vers un polygone adjacent. A la capacité de continuer à glisser s'il atterrit sur la couleur choisie ou une unité alliée, permettant un mouvement prolongé. Peut aussi capturer plusieurs unités ennemies si elles sont sur la couleur choisie.</p>
                    </div>
                    <p>Les Soldats sont bloqués par les <span class="accent">Arêtes Rouges</span>. Leur capacité spéciale de <span class="accent">Glissade</span> en fait les pièces les plus dangereuses du jeu.</p>
                `
            },
            minotaur: {
                title: "Le Minotaur",
                content: `
                    <p>La Garde Inamovible : des anciens minotaurs qui ne peuvent être détruits.</p>
                    <div class="card">
                        <h3>Minotaur (Glisseur)</h3>
                        <p>Identique aux Soldats mais <span class="accent">Invulnérable</span>. Ils ne peuvent être capturés ni ciblés par des effets de zone. Ils agissent comme des obstacles stratégiques.</p>
                    </div>
                `
            },
            witch: {
                title: "La Sorcière",
                content: `
                    <p>Des mystiques manipulant l'essence chromatique du plateau.</p>
                    <div class="card">
                        <h3>Type : <span class="accent">Sauteur</span></h3>
                        <p>Mouvement : <span class="highlight">Portée de Saut 4</span>. <span class="accent">Doit atterrir sur sa couleur de départ</span>.</p>
                    </div>
                    <div class="card">
                        <h3>Capacité : <span class="accent">Explosion d'Atterrissage</span></h3>
                        <p>En atterrissant sur un polygone vide, la Sorcière détruit toutes les pièces ennemies <span class="accent">adjacentes par glissement</span> (slide-adjacent) à sa destination.</p>
                    </div>
                `
            },
            global_overview: {
                title: "Vue d'ensemble",
                content: `
                    <p>Ce diagramme représente un <span class="accent">plateau de départ complet</span> après la Phase de Placement. Notez comment les ancres centrales sont réparties et les lignes de front renforcées par l'infanterie.</p>
                    <div class="card">
                        <h3>Positionnement Final</h3>
                        <ul style="padding-left: 1.5rem; color: var(--text-secondary)">
                            <li>Déesses protégées par des Minotaurs.</li>
                            <li>Héros positionnés pour l'éclaireur précoce.</li>
                            <li>Sorcières réparties sur le spectre des couleurs.</li>
                            <li>Sirènes et Goules protégeant les avancées.</li>
                        </ul>
                    </div>
                    <p>À partir de ce point, les joueurs commencent la <span class="accent">Phase de Jeu</span> en sélectionnant leurs premières couleurs.</p>
                `
            }
        }
    },
    es: {
        menu: {
            intro: "Introducción",
            setup_phase: "Fase de Configuración",
            board: "El Tablero y Topología",
            turn: "Mecánicas de Turno",
            goddess: "La Diosa",
            heroe: "El Héroe",
            mage: "El Mago",
            siren: "La Sirena",
            ghoul: "El Necrófago",
            witch: "La Bruja",
            soldier: "El Soldado",
            minotaur: "El Minotauro",
            global_overview: "Resumen Global"
        },
        sections: {
            intro: {
                title: "Introducción",
                content: `
                    <div class="card">
                        <h2 style="margin-top: 0">El Objetivo</h2>
                        <p>El objetivo principal es <span class="accent">capturar la Diosa del oponente</span>. El juego termina inmediatamente cuando una Diosa es eliminada del tablero.</p>
                    </div>
                    <p>Compiten dos bandos: <span class="accent">Blanco</span> y <span class="accent">Negro</span>. El Blanco comienza en la parte superior del tablero y el Negro en la inferior. El Blanco mueve primero seleccionando un color inicial.</p>
                `
            },
            setup_phase: {
                title: "Fase de Configuración",
                content: `
                    <p>Antes de que comience la fase de "Juego", los jugadores deben posicionar sus fuerzas centrales. La colocación está estrictamente regulada en 5 pasos:</p>
                    <ol class="setup-steps">
                        <li>
                            <h3 class="accent">1. La Diosa</h3>
                            <p>Debe colocarse en el <span class="highlight">borde lejano</span> de tu lado del tablero.</p>
                        </li>
                        <li>
                            <h3 class="accent">2. Los Héroes</h3>
                            <p>Colocados en los bordes, entre <span class="highlight">4 y 6 saltos</span> de distancia de la Diosa, y al menos a 6 saltos de distancia entre sí.</p>
                        </li>
                        <li>
                            <h3 class="accent">3. Los Minotauros</h3>
                            <p>Los <span class="accent">Minotauros</span> se colocan a 1-2 saltos de distancia de la Diosa para formar un escudo defensivo.</p>
                        </li>
                        <li>
                            <h3 class="accent">4. El Anillo Cromático</h3>
                            <p>Las <span class="accent">Brujas</span> se distribuyen en 4 colores únicos lo más cerca posible de tus piezas de anclaje.</p>
                        </li>
                        <li>
                            <h3 class="accent">5. Despliegue de Infantería</h3>
                            <p><span class="accent">Necrófagos</span> y <span class="accent">Sirenas</span> ocupan las posiciones tácticas restantes cerca de tus anclas.</p>
                        </li>
                    </ol>
                `
            },
            board: {
                title: "Tablero y Topología",
                content: `
                    <div class="card">
                        <h3><span class="accent">Deslizar</span> (Slide)</h3>
                        <p>Las piezas se mueven entre polígonos que comparten un borde. <span class="highlight">Los Bordes Rojos bloquean el deslizamiento</span>.</p>
                    </div>
                    <div class="card">
                        <h3><span class="accent">Saltar</span> (Jump)</h3>
                        <p>Las piezas "saltan" sobre los bordes, ignorando polígonos intermedios y <span class="highlight">Bordes Rojos</span>.</p>
                    </div>
                `
            },
            turn: {
                title: "Mecánicas de Turno",
                content: `
                    <div class="card">
                        <h3>1. Elegir Color</h3>
                        <p>Selecciona uno de los colores que permita al menos un movimiento legal.</p>
                    </div>
                    <div class="card">
                        <h3>2. Activar Pieza</h3>
                        <p>Cualquier pieza que coincida con el color elegido puede moverse. Las piezas en la reserva también pueden desplegarse.</p>
                    </div>
                `
            },
            goddess: {
                title: "La Diosa",
                content: `
                    <div class="card">
                        <h3>Tipo: <span class="accent">Saltadora</span></h3>
                        <p>Movimiento: <span class="highlight">Rango de Salto 2</span>. Es la pieza más vital; si es capturada, pierdes el juego.</p>
                    </div>
                `
            },
            heroe: {
                title: "El Héroe",
                content: `
                    <div class="card">
                        <h3>Tipo: <span class="accent">Saltador</span></h3>
                        <p>Movimiento: <span class="highlight">Rango de Salto 3</span>. Capturar a un enemigo le permite saltar <span class="highlight">inmediatamente de nuevo</span>.</p>
                    </div>
                `
            },
            mage: {
                title: "El Mago",
                content: `
                    <div class="card">
                        <h3>Tipo: <span class="accent">Saltador</span></h3>
                        <p>Movimiento: <span class="highlight">Rango 3</span>. <span class="accent">Debe cambiar de color</span> en cada salto.</p>
                    </div>
                    <div class="card">
                        <h3>Especial: <span class="accent">Desbloqueo Cromático</span></h3>
                        <p>El Mago está <span class="highlight">Bloqueado</span> al inicio. Solo se activa cuando se han usado los 4 colores del tablero.</p>
                    </div>
                `
            },
            siren: {
                title: "La Sirena",
                content: `
                    <div class="card">
                        <h3>Especial: <span class="accent">El Anclaje</span></h3>
                        <p>Las piezas enemigas <span class="highlight">adyacentes</span> a la Sirena quedan "ancladas" y no pueden moverse.</p>
                    </div>
                `
            },
            ghoul: {
                title: "El Necrófago",
                content: `
                    <div class="card">
                        <h3>Tipo: <span class="accent">Deslizador</span></h3>
                        <p>Movimiento: <span class="highlight">Rango 3</span>. Útil para formar cadenas defensivas con los Soldados.</p>
                    </div>
                `
            },
            soldier: {
                title: "El Soldado",
                content: `
                    <div class="card">
                        <h3>Tipo: <span class="accent">Deslizador</span></h3>
                        <p>Se mueve deslizándose por polígonos adyacentes. Puede capturar múltiples enemigos si están en el color elegido.</p>
                    </div>
                `
            },
            minotaur: {
                title: "El Minotauro",
                content: `
                    <div class="card">
                        <h3>Tipo: <span class="accent">Invulnerable</span></h3>
                        <p>Idéntico al Soldado pero <span class="accent">no puede ser capturado</span> ni afectado por explosiones de área.</p>
                    </div>
                `
            },
            witch: {
                title: "La Bruja",
                content: `
                    <div class="card">
                        <h3>Tipo: <span class="accent">Saltadora</span></h3>
                        <p>Movimiento: <span class="highlight">Rango 4</span>. <span class="accent">Debe aterrizar en su color inicial</span>.</p>
                    </div>
                    <div class="card">
                        <h3>Habilidad: <span class="accent">Explosión de Aterrizaje</span></h3>
                        <p>Al aterrizar, destruye a todos los enemigos adyacentes a su destino.</p>
                    </div>
                `
            },
            global_overview: {
                title: "Resumen Global",
                content: `
                    <p>Posicionamiento final tras la fase de configuración: Diosas protegidas por Minotauros, Héroes listos para incursiones y Brujas cubriendo el espectro de colores.</p>
                `
            }
        }
    },
    it: {
        menu: {
            intro: "Introduzione",
            setup_phase: "Fase de Configurazione",
            board: "Tabellone e Topologia",
            turn: "Meccaniche del Turno",
            goddess: "La Dea",
            heroe: "L'Eroe",
            mage: "Il Mago",
            siren: "La Sirena",
            ghoul: "Il Ghoul",
            witch: "La Strega",
            soldier: "Il Soldato",
            minotaur: "Il Minotaur",
            global_overview: "Panoramica Globale"
        },
        sections: {
            intro: {
                title: "Introduzione",
                content: `
                    <div class="card">
                        <h2 style="margin-top: 0">L'Obiettivo</h2>
                        <p>L'obiettivo principale è <span class="accent">catturare la Dea dell'avversario</span>. Il gioco termina immediatamente quando una Dea viene rimossa dal tabellone.</p>
                    </div>
                    <p>Due schieramenti competono: <span class="accent">Bianco</span> e <span class="accent">Nero</span>. Il Bianco inizia in cima al tabellone e il Nero in fondo.</p>
                `
            },
            setup_phase: {
                title: "Fase di Configurazione",
                content: `
                    <p>Prima della fase di "Gioco", i giocatori devono posizionare le loro forze. Il posizionamento segue 5 fasi:</p>
                    <ol class="setup-steps">
                        <li><h3 class="accent">1. La Dea</h3><p>Deve stare sul <span class="highlight">bordo estremo</span>.</p></li>
                        <li><h3 class="accent">2. Gli Eroi</h3><p>Tra <span class="highlight">4 e 6 salti</span> dalla Dea.</p></li>
                        <li><h3 class="accent">3. I Minotaur</h3><p>Protezione ravvicinata (1-2 salti) per la Dea.</p></li>
                        <li><h3 class="accent">4. L'Anello Cromatico</h3><p>Le <span class="accent">Streghe</span> distribuite su 4 colori diversi.</p></li>
                        <li><h3 class="accent">5. Fanteria</h3><p><span class="accent">Ghoul</span> e <span class="accent">Sirene</span> completano le linee.</p></li>
                    </ol>
                `
            },
            board: {
                title: "Tabellone e Topologia",
                content: `
                    <div class="card">
                        <h3><span class="accent">Scivolata</span> (Slide)</h3>
                        <p>Movimento tra poligoni adiacenti. <span class="highlight">I Bordi Rossi bloccano la scivolata</span>.</p>
                    </div>
                    <div class="card">
                        <h3><span class="accent">Salto</span> (Jump)</h3>
                        <p>Le pezzi scavalcano i bordi, ignorando i <span class="highlight">Bordi Rossi</span>.</p>
                    </div>
                `
            },
            turn: {
                title: "Meccaniche del Turno",
                content: `
                    <div class="card">
                        <h3>1. Scegli il Colore</h3>
                        <p>Scegli un colore che permetta almeno una mossa legale.</p>
                    </div>
                `
            },
            goddess: {
                title: "La Dea",
                content: `
                    <div class="card">
                        <h3>Tipo: <span class="accent">Saltatore</span></h3>
                        <p>Distanza di Salto: <span class="highlight">2</span>. Proteggila a ogni costo.</p>
                    </div>
                `
            },
            heroe: {
                title: "L'Eroe",
                content: `
                    <div class="card">
                        <h3>Tipo: <span class="accent">Saltatore</span></h3>
                        <p>Salto: <span class="highlight">3</span>. Dopo una cattura, può saltare <span class="highlight">di nuovo inmediatamente</span>.</p>
                    </div>
                `
            },
            mage: {
                title: "Il Mago",
                content: `
                    <div class="card">
                        <h3>Speciale: <span class="accent">Sblocco Cromatico</span></h3>
                        <p>Il Mago è <span class="highlight">Bloccato</span> all'inizio. Diventa disponibile solo dopo che tutti e 4 i colori sono stati scelti.</p>
                    </div>
                `
            },
            siren: {
                title: "La Sirena",
                content: `
                    <div class="card">
                        <h3>Speciale: <span class="accent">Blocco</span></h3>
                        <p>I nemici <span class="highlight">adiacenti</span> alla Sirena sono bloccati e non possono muoversi.</p>
                    </div>
                `
            },
            ghoul: {
                title: "Il Ghoul",
                content: `
                    <div class="card">
                        <h3>Tipo: <span class="accent">Marciatore</span></h3>
                        <p>Movimento: <span class="highlight">Distanza 3</span>.</p>
                    </div>
                `
            },
            soldier: {
                title: "Il Soldato",
                content: `
                    <div class="card">
                        <h3>Tipo: <span class="accent">Marciatore</span></h3>
                        <p>Scivola attraverso catene di poligoni. Può catturare più nemici.</p>
                    </div>
                `
            },
            minotaur: {
                title: "Il Minotaur",
                content: `
                    <div class="card">
                        <h3>Tipo: <span class="accent">Invulnerabile</span></h3>
                        <p>Non può essere catturato né distrutto dalle esplosioni.</p>
                    </div>
                `
            },
            witch: {
                title: "La Strega",
                content: `
                    <div class="card">
                        <h3>Tipo: <span class="accent">Saltatore</span></h3>
                        <p>Salto: <span class="highlight">4</span>. Deve atterrare sul suo colore di partenza.</p>
                    </div>
                    <div class="card">
                        <h3>Abilità: <span class="accent">Esplosione</span></h3>
                        <p>Distrugge i nemici adiacenti quando atterra.</p>
                    </div>
                `
            },
            global_overview: {
                title: "Panoramica Globale",
                content: `
                    <p>Posizionamento finale: Dee protette dai Minotaur, Eroi pronti all'attacco e Streghe posizionate strategicamente.</p>
                `
            }
        }
    },
    de: {
        menu: {
            intro: "Einleitung",
            setup_phase: "Einstiegsphase",
            board: "Spielfeld & Topologie",
            turn: "Zugmechanik",
            goddess: "Die Göttin",
            heroe: "Der Held",
            mage: "Der Magier",
            siren: "Die Sirene",
            ghoul: "Der Ghul",
            witch: "Die Hexe",
            soldier: "Der Soldat",
            minotaur: "Der Minotaur",
            global_overview: "Gesamtübersicht"
        },
        sections: {
            intro: {
                title: "Einleitung",
                content: `
                    <div class="card">
                        <h2 style="margin-top: 0">Das Ziel</h2>
                        <p>Das Hauptziel ist es, die <span class="accent">Göttin des Gegners zu schlagen</span>. Das Spiel endet sofort, wenn eine Göttin vom Feld entfernt wird.</p>
                    </div>
                `
            },
            setup_phase: {
                title: "Einstiegsphase",
                content: `
                    <p>Bevor die Spielphase beginnt, müssen die Spieler ihre Kräfte positionieren. Die Aufstellung erfolgt in 5 Schritten:</p>
                    <ol class="setup-steps">
                        <li><h3 class="accent">1. Die Göttin</h3><p>Wird am <span class="highlight">äußersten Rand</span> platziert.</p></li>
                        <li><h3 class="accent">2. Die Helden</h3><p>Zwischen <span class="highlight">4 und 6 Sprüngen</span> von der Göttin entfernt.</p></li>
                        <li><h3 class="accent">3. Die Minotaurs</h3><p>Schutzschilde in der Nähe der Göttin.</p></li>
                        <li><h3 class="accent">4. Der Chromatische Ring</h3><p>Die <span class="accent">Hexen</span> werden auf 4 verschiedene Farben verteilt.</p></li>
                        <li><h3 class="accent">5. Infanterie</h3><p><span class="accent">Ghule</span> und <span class="accent">Sirenen</span> füllen die taktischen Lücken.</p></li>
                    </ol>
                `
            },
            board: {
                title: "Spielfeld & Topologie",
                content: `
                    <div class="card">
                        <h3><span class="accent">Gleiten</span> (Slide)</h3>
                        <p>Bewegung zwischen benachbarten Polygonen. <span class="highlight">Rote Kanten blockieren das Gleiten</span>.</p>
                    </div>
                    <div class="card">
                        <h3><span class="accent">Springen</span> (Jump)</h3>
                        <p>Figuren "springen" über Kanten und ignorieren <span class="highlight">Rote Kanten</span>.</p>
                    </div>
                `
            },
            turn: {
                title: "Zugmechanik",
                content: `
                    <p>Wählen Sie eine Farbe, die mindestens einen legalen Zug ermöglicht. Alle Figuren dieser Farbe dürfen bewegt werden.</p>
                `
            },
            goddess: {
                title: "Die Göttin",
                content: `
                    <div class="card">
                        <h3>Typ: <span class="accent">Springer</span></h3>
                        <p>Sprungweite: <span class="highlight">2</span>. Die wichtigste Figur; wird sie geschlagen, ist das Spiel verloren.</p>
                    </div>
                `
            },
            heroe: {
                title: "Der Held",
                content: `
                    <div class="card">
                        <h3>Typ: <span class="accent">Springer</span></h3>
                        <p>Sprungweite: <span class="highlight">3</span>. Nach einem Schlag darf er <span class="highlight">sofort erneut springen</span>.</p>
                    </div>
                `
            },
            mage: {
                title: "Der Magier",
                content: `
                    <div class="card">
                        <h3>Spezial: <span class="accent">Chromatische Freischaltung</span></h3>
                        <p>Der Magier ist zu Beginn <span class="highlight">Gesperrt</span>. Er wird erst aktiviert, wenn alle 4 Farben auf dem Feld gewählt wurden.</p>
                    </div>
                `
            },
            siren: {
                title: "Die Sirene",
                content: `
                    <div class="card">
                        <h3>Spezial: <span class="accent">Verankerung</span></h3>
                        <p>Gegnerische Figuren <span class="highlight">neben</span> der Sirene sind verankert und können sich nicht bewegen.</p>
                    </div>
                `
            },
            ghoul: {
                title: "Der Ghul",
                content: `
                    <div class="card">
                        <h3>Typ: <span class="accent">Gleiter</span></h3>
                        <p>Reichweite: <span class="highlight">3</span>.</p>
                    </div>
                `
            },
            soldier: {
                title: "Der Soldat",
                content: `
                    <div class="card">
                        <h3>Typ: <span class="accent">Gleiter</span></h3>
                        <p>Gleitet durch Polygonketten und kann mehrere Gegner schlagen.</p>
                    </div>
                `
            },
            minotaur: {
                title: "Der Minotaur",
                content: `
                    <div class="card">
                        <h3>Typ: <span class="accent">Unverwundbar</span></h3>
                        <p>Kann nicht geschlagen oder durch Explosionen zerstört werden.</p>
                    </div>
                `
            },
            witch: {
                title: "Die Hexe",
                content: `
                    <div class="card">
                        <h3>Typ: <span class="accent">Springer</span></h3>
                        <p>Sprungweite: <span class="highlight">4</span>. Muss auf ihrer Startfarbe landen.</p>
                    </div>
                `
            },
            global_overview: {
                title: "Gesamtübersicht",
                content: `
                    <p>Die Aufstellung ist abgeschlossen. Die Göttinnen sind geschützt, die Helden bereit für den Angriff.</p>
                `
            }
        }
    },
    nl: {
        menu: {
            intro: "Inleiding",
            setup_phase: "Opstelfase",
            board: "Speelbord & Topologie",
            turn: "Beurtmechanica",
            goddess: "De Godin",
            heroe: "De Held",
            mage: "De Magiër",
            siren: "De Sirene",
            ghoul: "De Ghul",
            witch: "De Heks",
            soldier: "De Soldaat",
            minotaur: "De Minotaur",
            global_overview: "Globaal Overzicht"
        },
        sections: {
            intro: {
                title: "Inleiding",
                content: `
                    <div class="card">
                        <h2 style="margin-top: 0">Het Doel</h2>
                        <p>Het hoofddoel is om de <span class="accent">Godin van de tegenstander te slaan</span>. Het spel eindigt direct als een Godin van het bord wordt verwijderd.</p>
                    </div>
                `
            },
            setup_phase: {
                title: "Opstelfase",
                content: `
                    <p>Voordat het spel begint, moeten spelers hun eenheden plaatsen. Dit gebeurt in 5 stappen:</p>
                    <ol class="setup-steps">
                        <li><h3 class="accent">1. De Godin</h3><p>Wordt aan de <span class="highlight">uiterste rand</span> geplaatst.</p></li>
                        <li><h3 class="accent">2. De Helden</h3><p>Tussen <span class="highlight">4 en 6 sprongen</span> van de Godin.</p></li>
                        <li><h3 class="accent">3. De Minotaurs</h3><p>Beschermende schilden nabij de Godin.</p></li>
                        <li><h3 class="accent">4. De Chromatische Ring</h3><p>De <span class="accent">Heksen</span> worden over 4 kleuren verdeeld.</p></li>
                        <li><h3 class="accent">5. Infanterie</h3><p><span class="accent">Ghuls</span> en <span class="accent">Sirenes</span> vullen de linies.</p></li>
                    </ol>
                `
            },
            board: {
                title: "Speelbord & Topologie",
                content: `
                    <div class="card">
                        <h3><span class="accent">Glijden</span> (Slide)</h3>
                        <p>Beweging tussen aangrenzende polygonen. <span class="highlight">Rode Randen blokkeren het glijden</span>.</p>
                    </div>
                `
            },
            turn: {
                title: "Beurtmechanica",
                content: `
                    <p>Kies een kleur die minstens één legale zet toestaat. Alle eenheden van die kleur kunnen bewegen.</p>
                `
            },
            goddess: {
                title: "De Godin",
                content: `
                    <div class="card">
                        <h3>Type: <span class="accent">Springer</span></h3>
                        <p>Sprongbereik: <span class="highlight">2</span>. Als zij wordt geslagen, verlies je.</p>
                    </div>
                `
            },
            heroe: {
                title: "De Held",
                content: `
                    <div class="card">
                        <h3>Type: <span class="accent">Springer</span></h3>
                        <p>Sprongbereik: <span class="highlight">3</span>. Mag <span class="highlight">direct opnieuw springen</span> na een slag.</p>
                    </div>
                `
            },
            mage: {
                title: "De Magiër",
                content: `
                    <div class="card">
                        <h3>Speciaal: <span class="accent">Chromatische Ontgrendeling</span></h3>
                        <p>De Magiër is <span class="highlight">Vergrendeld</span> aan het begin.</p>
                    </div>
                `
            },
            siren: {
                title: "De Sirene",
                content: `
                    <div class="card">
                        <h3>Speciaal: <span class="accent">Verankering</span></h3>
                        <p>Vijanden <span class="highlight">naast</span> de Sirene kunnen niet bewegen.</p>
                    </div>
                `
            },
            ghoul: {
                title: "De Ghul",
                content: `
                    <div class="card">
                        <h3>Type: <span class="accent">Glijder</span></h3>
                        <p>Bereik: <span class="highlight">3</span>.</p>
                    </div>
                `
            },
            soldier: {
                title: "De Soldaat",
                content: `
                    <div class="card">
                        <h3>Type: <span class="accent">Glijder</span></h3>
                        <p>Glijdt door reeksen polygonen.</p>
                    </div>
                `
            },
            minotaur: {
                title: "De Minotaur",
                content: `
                    <div class="card">
                        <h3>Type: <span class="accent">Onkwetsbaar</span></h3>
                        <p>Kan niet worden geslagen.</p>
                    </div>
                `
            },
            witch: {
                title: "De Heks",
                content: `
                    <div class="card">
                        <h3>Type: <span class="accent">Springer</span></h3>
                        <p>Sprongbereik: <span class="highlight">4</span>.</p>
                    </div>
                `
            },
            global_overview: {
                title: "Globaal Overzicht",
                content: `
                    <p>Alle eenheden staan klaar voor de strijd.</p>
                `
            }
        }
    },
    zh: {
        menu: {
            intro: "介绍",
            setup_phase: "配置阶段",
            board: "棋盘与地貌",
            turn: "回合机制",
            goddess: "女神",
            heroe: "英雄",
            mage: "法师",
            siren: "塞壬",
            ghoul: "食尸鬼",
            witch: "女巫",
            soldier: "士兵",
            minotaur: "弥诺陶洛斯",
            global_overview: "全局总览"
        },
        sections: {
            intro: {
                title: "介绍",
                content: `
                    <div class="card">
                        <h2 style="margin-top: 0">目标</h2>
                        <p>主要目标是 <span class="accent">俘获对方的女神</span>。一旦女神从棋盘上消失，比赛立即结束。</p>
                    </div>
                `
            },
            setup_phase: {
                title: "配置阶段",
                content: `
                    <p>在游戏正式开始前，玩家需布置兵力。放置过程分为5步：</p>
                    <ol class="setup-steps">
                        <li><h3 class="accent">1. 女神</h3><p>必须放置在己方半场的 <span class="highlight">远端边缘</span>。</p></li>
                        <li><h3 class="accent">2. 英雄</h3><p>距女神 <span class="highlight">4-6个跳跃</span> 的距离。</p></li>
                        <li><h3 class="accent">3. 傀儡</h3><p>放置在女神附近（1-2个跳跃）作为防御盾牌。</p></li>
                        <li><h3 class="accent">4. 色彩环</h3><p><span class="accent">女巫</span> 需分布在4种不同的颜色上。</p></li>
                        <li><h3 class="accent">5. 步兵部署</h3><p><span class="accent">食尸鬼</span> 和 <span class="accent">塞壬</span> 占据剩余的位置。</p></li>
                    </ol>
                `
            },
            board: {
                title: "棋盘与地貌",
                content: `
                    <div class="card">
                        <h3><span class="accent">滑动</span> (Slide)</h3>
                        <p>在共享边缘的多边形之间移动。<span class="highlight">红色边缘阻挡滑动</span>。</p>
                    </div>
                `
            },
            turn: {
                title: "回合机制",
                content: `
                    <p>选择一种颜色，该颜色必须允许至少一个合法移动。该颜色的所有棋子均可移动。</p>
                `
            },
            goddess: {
                title: "女神",
                content: `
                    <div class="card">
                        <h3>类型：<span class="accent">跳跃者</span></h3>
                        <p>跳跃范围：<span class="highlight">2</span>。最重要的棋子；若被俘，比赛判负。</p>
                    </div>
                `
            },
            heroe: {
                title: "英雄",
                content: `
                    <div class="card">
                        <h3>类型：<span class="accent">跳跃者</span></h3>
                        <p>跳跃范围：<span class="highlight">3</span>。俘获敌人后可 <span class="highlight">立即再次跳跃</span>。</p>
                    </div>
                `
            },
            mage: {
                title: "法师",
                content: `
                    <div class="card">
                        <h3>特殊：<span class="accent">色彩解锁</span></h3>
                        <p>法师在开始时处于 <span class="highlight">锁定</span> 状态。只有当棋盘上的4种颜色均被选择过一次后才会激活。</p>
                    </div>
                `
            },
            siren: {
                title: "塞壬",
                content: `
                    <div class="card">
                        <h3>特殊：<span class="accent">锚定</span></h3>
                        <p>与塞壬 <span class="highlight">相邻</span> 的敌方棋子将被锚定，无法移动。</p>
                    </div>
                `
            },
            ghoul: {
                title: "食尸鬼",
                content: `
                    <div class="card">
                        <h3>类型：<span class="accent">滑动者</span></h3>
                        <p>范围：<span class="highlight">3</span>。</p>
                    </div>
                `
            },
            soldier: {
                title: "士兵",
                content: `
                    <div class="card">
                        <h3>类型：<span class="accent">滑动者</span></h3>
                        <p>在多边形链中滑动，可一次俘获多个敌人。</p>
                    </div>
                `
            },
            minotaur: {
                title: "傀儡",
                content: `
                    <div class="card">
                        <h3>类型：<span class="accent">无敌</span></h3>
                        <p>无法被俘获，也不受区域爆炸影响。</p>
                    </div>
                `
            },
            witch: {
                title: "女巫",
                content: `
                    <div class="card">
                        <h3>类型：<span class="accent">跳跃者</span></h3>
                        <p>跳跃范围：<span class="highlight">4</span>。必须降落在起始颜色上。</p>
                    </div>
                `
            },
            global_overview: {
                title: "全局总览",
                content: `
                    <p>兵力布置已完成。女神受到保护，英雄准备出击。</p>
                `
            }
        }
    },
    ja: {
        menu: {
            intro: "はじめに",
            setup_phase: "配置フェーズ",
            board: "ボードとトポロジー",
            turn: "ターンの仕組み",
            goddess: "女神",
            heroe: "英雄",
            mage: "魔術師",
            siren: "セイレーン",
            ghoul: "グール",
            witch: "魔女",
            soldier: "兵士",
            minotaur: "ミノタウロス",
            global_overview: "全体概要"
        },
        sections: {
            intro: {
                title: "はじめに",
                content: `
                    <div class="card">
                        <h2 style="margin-top: 0">目的</h2>
                        <p>主な目的は <span class="accent">相手の女神を捕獲する</span> ことです。女神がボードから取り除かれると、その時点でゲーム終了となります。</p>
                    </div>
                `
            },
            setup_phase: {
                title: "配置フェーズ",
                content: `
                    <p>ゲームの「プレイ」フェーズが始まる前に、プレイヤーは部隊を配置する必要があります。配置は厳密に5つのステップで行われます：</p>
                    <ol class="setup-steps">
                        <li><h3 class="accent">1. 女神</h3><p>ボード上の自陣の <span class="highlight">最も遠い端</span> に配置します。</p></li>
                        <li><h3 class="accent">2. 英雄</h3><p>女神から <span class="highlight">4〜6ジャンプ</span> 離れた端に配置します。</p></li>
                        <li><h3 class="accent">3. ゴーレム</h3><p>女神の近く（1〜2ジャンプ）に守りの盾として配置します。</p></li>
                        <li><h3 class="accent">4. 彩色の輪</h3><p><span class="accent">魔女</span> は4種類の異なる色に分散して配置します。</p></li>
                        <li><h3 class="accent">5. 歩兵の展開</h3><p><span class="accent">グール</span> と <span class="accent">セイレーン</span> が残りの位置を占めます。</p></li>
                    </ol>
                `
            },
            board: {
                title: "ボードとトポロジー",
                content: `
                    <div class="card">
                        <h3><span class="accent">スライド</span> (Slide)</h3>
                        <p>接する多角形の間を移動します。<span class="highlight">赤いエッジはスライドをブロックします</span>。</p>
                    </div>
                    <div class="card">
                        <h3><span class="accent">ジャンプ</span> (Jump)</h3>
                        <p>エッジを跳び越え、中間の多角形や <span class="highlight">赤いエッジ</span> を無視します。</p>
                    </div>
                `
            },
            turn: {
                title: "ターンの仕組み",
                content: `
                    <p>合法な移動が少なくとも1つ可能な色を選択します。選択された色のすべての駒が移動可能です。</p>
                `
            },
            goddess: {
                title: "女神",
                content: `
                    <div class="card">
                        <h3>型：<span class="accent">ジャンパー</span></h3>
                        <p>ジャンプ範囲：<span class="highlight">2</span>。最も重要な駒であり、捕獲されると敗北します。</p>
                    </div>
                `
            },
            heroe: {
                title: "英雄",
                content: `
                    <div class="card">
                        <h3>型：<span class="accent">ジャンパー</span></h3>
                        <p>ジャンプ範囲：<span class="highlight">3</span>。敵を捕獲すると <span class="highlight">即座にもう一度ジャンプ</span> できます。</p>
                    </div>
                `
            },
            mage: {
                title: "魔術師",
                content: `
                    <div class="card">
                        <h3>特殊：<span class="accent">彩色の解放</span></h3>
                        <p>魔術師は開始時 <span class="highlight">ロック</span> されています。ボード上の4色すべてが選択された後にアクティブになります。</p>
                    </div>
                `
            },
            siren: {
                title: "セイレーン",
                content: `
                    <div class="card">
                        <h3>特殊：<span class="accent">固定</span></h3>
                        <p>セイレーンに <span class="highlight">隣接</span> する敵の駒は固定され、移動できなくなります。</p>
                    </div>
                `
            },
            ghoul: {
                title: "グール",
                content: `
                    <div class="card">
                        <h3>型：<span class="accent">スライダー</span></h3>
                        <p>範囲：<span class="highlight">3</span>。</p>
                    </div>
                `
            },
            soldier: {
                title: "兵士",
                content: `
                    <div class="card">
                        <h3>型：<span class="accent">スライダー</span></h3>
                        <p>多角形の連鎖をスライドし、複数の敵を捕獲可能です。</p>
                    </div>
                `
            },
            minotaur: {
                title: "ゴーレム",
                content: `
                    <div class="card">
                        <h3>型：<span class="accent">無敵</span></h3>
                        <p>捕獲されず、エリア爆発の影響も受けません。</p>
                    </div>
                `
            },
            witch: {
                title: "魔女",
                content: `
                    <div class="card">
                        <h3>型：<span class="accent">ジャンパー</span></h3>
                        <p>ジャンプ範囲：<span class="highlight">4</span>。開始時と同じ色に着地する必要があります。</p>
                    </div>
                `
            },
            global_overview: {
                title: "全体概要",
                content: `
                    <p>配置フェーズが完了しました。女神は護られ、英雄は出撃の準備が整っています。</p>
                `
            }
        }
    },
    ko: {
        menu: {
            intro: "소개",
            setup_phase: "배치 단계",
            board: "보드 및 위상",
            turn: "턴 메커니즘",
            goddess: "여신",
            heroe: "영웅",
            mage: "마법사",
            siren: "세이렌",
            ghoul: "구울",
            witch: "마녀",
            soldier: "병사",
            minotaur: "미노타우로스",
            global_overview: "전체 개요"
        },
        sections: {
            intro: {
                title: "소개",
                content: `
                    <div class="card">
                        <h2 style="margin-top: 0">목표</h2>
                        <p>주요 목표는 <span class="accent">상대의 여신을 포획</span>하는 것입니다. 여신이 보드에서 제거되면 게임이 즉시 종료됩니다.</p>
                    </div>
                `
            },
            setup_phase: {
                title: "배치 단계",
                content: `
                    <p>게임이 시작되기 전에 플레이어는 부대를 배치해야 합니다. 배치는 5단계로 진행됩니다:</p>
                    <ol class="setup-steps">
                        <li><h3 class="accent">1. 여신</h3><p>보드의 <span class="highlight">가장 먼 가장자리</span>에 배치합니다.</p></li>
                        <li><h3 class="accent">2. 영웅</h3><p>여신으로부터 <span class="highlight">4~6회 점프</span> 거리 내에 배치합니다.</p></li>
                        <li><h3 class="accent">3. 골렘</h3><p>여신 주변(1~2회 점프)에 방어막으로 배치합니다.</p></li>
                        <li><h3 class="accent">4. 색상 링</h3><p><span class="accent">마녀</span>는 4가지 서로 다른 색상에 분산 배치합니다.</p></li>
                        <li><h3 class="accent">5. 보병 전개</h3><p><span class="accent">구울</span>과 <span class="accent">세이렌</span>이 나머지 위치를 채웁니다.</p></li>
                    </ol>
                `
            },
            board: {
                title: "보드 및 위상",
                content: `
                    <div class="card">
                        <h3><span class="accent">슬라이드</span> (Slide)</h3>
                        <p>가장자리를 공유하는 다각형 사이를 이동합니다. <span class="highlight">빨간색 테두리는 슬라이드를 차단합니다</span>.</p>
                    </div>
                    <div class="card">
                        <h3><span class="accent">점프</span> (Jump)</h3>
                        <p>테두리를 뛰어넘어 중간의 다각형이나 <span class="highlight">빨간색 테두리</span>를 무시합니다.</p>
                    </div>
                `
            },
            turn: {
                title: "턴 메커니즘",
                content: `
                    <p>최소 하나 이상의 유효한 이동이 가능한 색상을 선택합니다. 선택된 색상의 모든 기물이 이동 가능합니다.</p>
                `
            },
            goddess: {
                title: "여신",
                content: `
                    <div class="card">
                        <h3>유형: <span class="accent">점퍼</span></h3>
                        <p>점프 범위: <span class="highlight">2</span>. 가장 중요한 기물이며, 포획당하면 패배합니다.</p>
                    </div>
                `
            },
            heroe: {
                title: "영웅",
                content: `
                    <div class="card">
                        <h3>유형: <span class="accent">점퍼</span></h3>
                        <p>점프 범위: <span class="highlight">3</span>. 적을 포획하면 <span class="highlight">즉시 다시 점프</span>할 수 있습니다.</p>
                    </div>
                `
            },
            mage: {
                title: "마법사",
                content: `
                    <div class="card">
                        <h3>특수: <span class="accent">색상 해제</span></h3>
                        <p>마법사는 시작 시 <span class="highlight">잠겨</span> 있습니다. 보드의 4가지 색상이 모두 선택된 후에 활성화됩니다.</p>
                    </div>
                `
            },
            siren: {
                title: "세이렌",
                content: `
                    <div class="card">
                        <h3>특수: <span class="accent">앵커링</span></h3>
                        <p>세이렌에 <span class="highlight">인접한</span> 적 기물은 고정되어 이동할 수 없습니다.</p>
                    </div>
                `
            },
            ghoul: {
                title: "구울",
                content: `
                    <div class="card">
                        <h3>유형: <span class="accent">슬라이더</span></h3>
                        <p>범위: <span class="highlight">3</span>.</p>
                    </div>
                `
            },
            soldier: {
                title: "병사",
                content: `
                    <div class="card">
                        <h3>유형: <span class="accent">슬라이더</span></h3>
                        <p>다각형 체인을 슬라이드하며 여러 적을 포획할 수 있습니다.</p>
                    </div>
                `
            },
            minotaur: {
                title: "골렘",
                content: `
                    <div class="card">
                        <h3>유형: <span class="accent">무적</span></h3>
                        <p>포획되지 않으며 광역 폭발의 영향을 받지 않습니다.</p>
                    </div>
                `
            },
            witch: {
                title: "마녀",
                content: `
                    <div class="card">
                        <h3>유형: <span class="accent">점퍼</span></h3>
                        <p>점프 범위: <span class="highlight">4</span>. 시작한 색상과 같은 색상의 칸에 착지해야 합니다.</p>
                    </div>
                `
            },
            global_overview: {
                title: "전체 개요",
                content: `
                    <p>배치가 완료되었습니다. 여신은 보호받고 있으며 영웅은 출격 준비가 되었습니다.</p>
                `
            }
        }
    },
    ms: {
        menu: {
            intro: "Pengenalan",
            setup_phase: "Fasa Persiapan",
            board: "Papan & Topologi",
            turn: "Mekanik Giliran",
            goddess: "Dewi",
            heroe: "Wira",
            mage: "Ahli Sihir",
            siren: "Siren",
            ghoul: "Ghoul",
            witch: "Penyihir",
            soldier: "Askar",
            minotaur: "Minotaur",
            global_overview: "Gambaran Keseluruhan"
        },
        sections: {
            intro: {
                title: "Pengenalan",
                content: `
                    <div class="card">
                        <h2 style="margin-top: 0">Objektif</h2>
                        <p>Objektif utama adalah untuk <span class="accent">menangkap Dewi lawan</span>. Permainan tamat serta-merta apabila Dewi dikeluarkan dari papan.</p>
                    </div>
                `
            },
            setup_phase: {
                title: "Fasa Persiapan",
                content: `
                    <p>Sebelum fasa permainan bermula, pemain mesti mengatur kedudukan tentera. Penempatan dilakukan dalam 5 langkah:</p>
                    <ol class="setup-steps">
                        <li><h3 class="accent">1. Dewi</h3><p>Mesti diletakkan di <span class="highlight">tepi jauh</span> kawasan anda.</p></li>
                        <li><h3 class="accent">2. Wira</h3><p>Di tepi, antara <span class="highlight">4 hingga 6 lompatan</span> dari Dewi.</p></li>
                        <li><h3 class="accent">3. Minotaur</h3><p>Sebagai perisai pertahanan berhampiran Dewi (1-2 lompatan).</p></li>
                        <li><h3 class="accent">4. Gelang Kromatik</h3><p><span class="accent">Penyihir</span> diagihkan pada 4 warna berbeza.</p></li>
                        <li><h3 class="accent">5. Aturan Infantri</h3><p><span class="accent">Ghoul</span> dan <span class="accent">Siren</span> mengisi baki kedudukan taktikal.</p></li>
                    </ol>
                `
            },
            board: {
                title: "Papan & Topologi",
                content: `
                    <div class="card">
                        <h3><span class="accent">Luncur</span> (Slide)</h3>
                        <p>Bergerak antara poligon yang berkongsi sempadan. <span class="highlight">Sempadan Merah menghalang luncuran</span>.</p>
                    </div>
                `
            },
            turn: {
                title: "Mekanik Giliran",
                content: `
                    <p>Pilih warna yang membolehkan sekurang-kurangnya satu pergerakan sah. Semua buah catur dengan warna yang dipilih boleh bergerak.</p>
                `
            },
            goddess: {
                title: "Dewi",
                content: `
                    <div class="card">
                        <h3>Jenis: <span class="accent">Lompatan</span></h3>
                        <p>Julat Lompatan: <span class="highlight">2</span>. Buah paling penting; jika ditangkap, anda kalah.</p>
                    </div>
                `
            },
            heroe: {
                title: "Wira",
                content: `
                    <div class="card">
                        <h3>Jenis: <span class="accent">Lompatan</span></h3>
                        <p>Julat Lompatan: <span class="highlight">3</span>. Menangkap musuh membolehkannya <span class="highlight">melompat semula serta-merta</span>.</p>
                    </div>
                `
            },
            mage: {
                title: "Ahli Sihir",
                content: `
                    <div class="card">
                        <h3>Khas: <span class="accent">Nyahkunci Kromatik</span></h3>
                        <p>Ahli Sihir <span class="highlight">Terkunci</span> pada mulanya. Ia diaktifkan hanya selepas 4 warna pada papan telah dipilih.</p>
                    </div>
                `
            },
            siren: {
                title: "Siren",
                content: `
                    <div class="card">
                        <h3>Khas: <span class="accent">Tambatan</span></h3>
                        <p>Musuh yang <span class="highlight">bersebelahan</span> dengan Siren akan tertambat dan tidak boleh bergerak.</p>
                    </div>
                `
            },
            ghoul: {
                title: "Ghoul",
                content: `
                    <div class="card">
                        <h3>Jenis: <span class="accent">Luncuran</span></h3>
                        <p>Julat: <span class="highlight">3</span>.</p>
                    </div>
                `
            },
            soldier: {
                title: "Askar",
                content: `
                    <div class="card">
                        <h3>Jenis: <span class="accent">Luncuran</span></h3>
                        <p>Meluncur melalui rangkaian poligon dan boleh menangkap berbilang musuh.</p>
                    </div>
                `
            },
            minotaur: {
                title: "Minotaur",
                content: `
                    <div class="card">
                        <h3>Jenis: <span class="accent">Kebal</span></h3>
                        <p>Tidak boleh ditangkap dan tidak terjejas oleh letupan kawasan.</p>
                    </div>
                `
            },
            witch: {
                title: "Penyihir",
                content: `
                    <div class="card">
                        <h3>Jenis: <span class="accent">Lompatan</span></h3>
                        <p>Julat Lompatan: <span class="highlight">4</span>. Mesti mendarat pada warna asalnya.</p>
                    </div>
                `
            },
            global_overview: {
                title: "Gambaran Keseluruhan",
                content: `
                    <p>Persiapan selesai. Dewi dilindungi dan wira sedia untuk menyerang.</p>
                `
            }
        }
    },
    hi: {
        menu: {
            intro: "परिचय",
            setup_phase: "तैयारी चरण",
            board: "बोर्ड और संरचना",
            turn: "बारी के नियम",
            goddess: "देवी",
            heroe: "वीर",
            mage: "जादूगर",
            siren: "सायरन",
            ghoul: "पिशाच",
            witch: "चुड़ैल",
            soldier: "सैनिक",
            minotaur: "मिनोटौर",
            global_overview: "वैश्विक अवलोकन"
        },
        sections: {
            intro: {
                title: "परिचय",
                content: `
                    <div class="card">
                        <h2 style="margin-top: 0">लक्ष्य</h2>
                        <p>मुख्य लक्ष्य <span class="accent">विरोधी की देवी को पकड़ना</span> है। जैसे ही देवी बोर्ड से हटाई जाती है, खेल तुरंत समाप्त हो जाता है।</p>
                    </div>
                `
            },
            setup_phase: {
                title: "तैयारी चरण",
                content: `
                    <p>खेल शुरू होने से पहले, खिलाड़ियों को अपनी सेना तैनात करनी होगी। इसके 5 चरण हैं:</p>
                    <ol class="setup-steps">
                        <li><h3 class="accent">1. देवी</h3><p>इसे अपने पक्ष के <span class="highlight">सबसे दूर के किनारे</span> पर रखना चाहिए।</p></li>
                        <li><h3 class="accent">2. वीर</h3><p>देवी से <span class="highlight">4 से 6 छलांग</span> की दूरी पर।</p></li>
                        <li><h3 class="accent">3. गोलेम</h3><p>देवी के पास (1-2 छलांग) रक्षा कवच के रूप में।</p></li>
                        <li><h3 class="accent">4. रंगों का घेरा</h3><p><span class="accent">चुड़ैलें</span> 4 अलग-अलग रंगों पर वितरित की जाती हैं।</p></li>
                        <li><h3 class="accent">5. पैदल सेना</h3><p><span class="accent">पिशाच</span> और <span class="accent">सायरन</span> बाकी रणनीतिक स्थानों को भरते हैं।</p></li>
                    </ol>
                `
            },
            board: {
                title: "बोर्ड और संरचना",
                content: `
                    <div class="card">
                        <h3><span class="accent">फिसलना</span> (Slide)</h3>
                        <p>समान किनारे वाले बहुभुजों के बीच चलना। <span class="highlight">लाल किनारे फिसलने को रोकते हैं</span>।</p>
                    </div>
                `
            },
            turn: {
                title: "बारी के नियम",
                content: `
                    <p>एक ऐसा रंग चुनें जो कम से कम एक कानूनी चाल की अनुमति दे। उस रंग के सभी मोहरे चल सकते हैं।</p>
                `
            },
            goddess: {
                title: "देवी",
                content: `
                    <div class="card">
                        <h3>प्रकार: <span class="accent">कूदने वाला</span></h3>
                        <p>कूदने की सीमा: <span class="highlight">2</span>। सबसे महत्वपूर्ण मोहरा; यदि यह पकड़ा गया, तो आप हार जाएंगे।</p>
                    </div>
                `
            },
            heroe: {
                title: "वीर",
                content: `
                    <div class="card">
                        <h3>प्रकार: <span class="accent">कूदने वाला</span></h3>
                        <p>कूदने की सीमा: <span class="highlight">3</span>। दुश्मन को पकड़ने पर यह <span class="highlight">तुरंत फिर से कूद</span> सकता है।</p>
                    </div>
                `
            },
            mage: {
                title: "जादूगर",
                content: `
                    <div class="card">
                        <h3>विशेष: <span class="accent">रंग अनलॉक</span></h3>
                        <p>जादूगर शुरुआत में <span class="highlight">लॉक</span> होता है। यह तभी सक्रिय होता है जब बोर्ड पर सभी 4 रंग चुन लिए जाते हैं।</p>
                    </div>
                `
            },
            siren: {
                title: "सायरन",
                content: `
                    <div class="card">
                        <h3>विशेष: <span class="accent">स्थिरीकरण</span></h3>
                        <p>सायरन के <span class="highlight">बगल वाले</span> दुश्मन मोहरे स्थिर हो जाते हैं और चल नहीं सकते।</p>
                    </div>
                `
            },
            ghoul: {
                title: "पिशाच",
                content: `
                    <div class="card">
                        <h3>प्रकार: <span class="accent">फिसलने वाला</span></h3>
                        <p>सीमा: <span class="highlight">3</span>।</p>
                    </div>
                `
            },
            soldier: {
                title: "सैनिक",
                content: `
                    <div class="card">
                        <h3>प्रकार: <span class="accent">फिसलने वाला</span></h3>
                        <p>बहुभुज श्रृंखला के माध्यम से फिसलता है और कई दुश्मनों को पकड़ सकता है।</p>
                    </div>
                `
            },
            minotaur: {
                title: "गोलेम",
                content: `
                    <div class="card">
                        <h3>प्रकार: <span class="accent">अभेद्य</span></h3>
                        <p>इसे पकड़ा नहीं जा सकता और इस पर विस्फोटों का असर नहीं होता।</p>
                    </div>
                `
            },
            witch: {
                title: "चुड़ैल",
                content: `
                    <div class="card">
                        <h3>प्रकार: <span class="accent">कूदने वाला</span></h3>
                        <p>कूदने की सीमा: <span class="highlight">4</span>। इसे अपने शुरुआती रंग पर ही उतरना होगा।</p>
                    </div>
                `
            },
            global_overview: {
                title: "वैश्विक अवलोकन",
                content: `
                    <p>तैयारी पूरी हुई। देवी सुरक्षित है और वीर आक्रमण के लिए तैयार हैं।</p>
                `
            }
        }
    },
    ta: {
        menu: {
            intro: "அறிமுகம்",
            setup_phase: "அமைப்பு கட்டம்",
            board: "பலகை மற்றும் இடவியல்",
            turn: "முறை மெக்கானிக்ஸ்",
            goddess: "தெய்வம்",
            heroe: "வீரன்",
            mage: "மந்திரவாதி",
            siren: "சைரன்",
            ghoul: "பூதம்",
            witch: "சூனியக்காரி",
            soldier: "போர்வீரன்",
            minotaur: "மினோட்டார்",
            global_overview: "உலகளாவிய கண்ணோட்டம்"
        },
        sections: {
            intro: {
                title: "அறிமுகம்",
                content: `
                    <div class="card">
                        <h2 style="margin-top: 0">இலக்கு</h2>
                        <p>முக்கிய இலக்கு <span class="accent">எதிரியின் தெய்வத்தை பிடிப்பது</span> ஆகும். பலகையில் இருந்து தெய்வம் அகற்றப்பட்டவுடன் விளையாட்டு முடிவடைகிறது.</p>
                    </div>
                `
            },
            setup_phase: {
                title: "அமைப்பு கட்டம்",
                content: `
                    <p>விளையாட்டு தொடங்கும் முன், வீரர்கள் தங்கள் படைகளை நிலைநிறுத்த வேண்டும். இது 5 படிகளில் செய்யப்படுகிறது:</p>
                    <ol class="setup-steps">
                        <li><h3 class="accent">1. தெய்வம்</h3><p>உங்கள் பக்கத்தின் <span class="highlight">தொலைதூர விளிம்பில்</span> வைக்கப்பட வேண்டும்.</p></li>
                        <li><h3 class="accent">2. வீரர்கள்</h3><p>தெய்வத்திலிருந்து <span class="highlight">4 முதல் 6 குதித்தல்</span> தொலைவில்.</p></li>
                        <li><h3 class="accent">3. கோலெம்கள்</h3><p>தெய்வத்திற்கு அருகில் பாதுகாப்பு கவசமாக.</p></li>
                        <li><h3 class="accent">4. வண்ண வளையம்</h3><p><span class="accent">சூனியக்காரிகள்</span> 4 வெவ்வேறு வண்ணங்களில் விநியோகிக்கப்படுகிறார்கள்.</p></li>
                        <li><h3 class="accent">5. காலாட்படை</h3><p><span class="accent">பூதங்கள்</span> மற்றும் <span class="accent">சைரன்கள்</span> மீதமுள்ள இடங்களை நிரப்புகின்றன.</p></li>
                    </ol>
                `
            },
            board: {
                title: "பலகை மற்றும் இடவியல்",
                content: `
                    <div class="card">
                        <h3><span class="accent">சறுக்குதல்</span> (Slide)</h3>
                        <p>விளிம்பைப் பகிர்ந்து கொள்ளும் பலகோணங்களுக்கு இடையே நகரும். <span class="highlight">சிவப்பு விளிம்புகள் சறுக்குவதைத் தடுக்கின்றன</span>.</p>
                    </div>
                `
            },
            turn: {
                title: "முறை மெக்கானிக்ஸ்",
                content: `
                    <p>குறைந்தது ஒரு சட்டபூர்வமான நகர்வை அனுமதிக்கும் ஒரு நிறத்தைத் தேர்வு செய்யவும். அந்த நிறத்தின் அனைத்து காய்களும் நகரலாம்.</p>
                `
            },
            goddess: {
                title: "தெய்வம்",
                content: `
                    <div class="card">
                        <h3>வகை: <span class="accent">குதிப்பவர்</span></h3>
                        <p>குதித்தல் வரம்பு: <span class="highlight">2</span>. மிக முக்கியமான காய்; இது பிடிக்கப்பட்டால் நீங்கள் தோற்பீர்கள்.</p>
                    </div>
                `
            },
            heroe: {
                title: "வீரன்",
                content: `
                    <div class="card">
                        <h3>வகை: <span class="accent">குதிப்பவர்</span></h3>
                        <p>குதித்தல் வரம்பு: <span class="highlight">3</span>. எதிரியைப் பிடிக்கும்போது இது <span class="highlight">உடனடியாக மீண்டும் குதிக்க</span> முடியும்.</p>
                    </div>
                `
            },
            mage: {
                title: "மந்திரவாதி",
                content: `
                    <div class="card">
                        <h3>சிறப்பு: <span class="accent">வண்ணத் திறப்பு</span></h3>
                        <p>மந்திரவாதி ஆரம்பத்தில் <span class="highlight">பூட்டப்பட்டிருப்பார்</span>. 4 நிறங்களும் தேர்ந்தெடுக்கப்பட்ட பிறகு அவர் செயல்படுவார்.</p>
                    </div>
                `
            },
            siren: {
                title: "சைரன்",
                content: `
                    <div class="card">
                        <h3>சிறப்பு: <span class="accent">நங்கூரமிடுதல்</span></h3>
                        <p>சைரனுக்கு <span class="highlight">அருகில் உள்ள</span> எதிரி காய்கள் நகர முடியாது.</p>
                    </div>
                `
            },
            ghoul: {
                title: "பூதம்",
                content: `
                    <div class="card">
                        <h3>வகை: <span class="accent">சறுக்குபவர்</span></h3>
                        <p>வரம்பு: <span class="highlight">3</span>.</p>
                    </div>
                `
            },
            soldier: {
                title: "போர்வீரன்",
                content: `
                    <div class="card">
                        <h3>வகை: <span class="accent">சறுக்குபவர்</span></h3>
                        <p>பலகோணச் சங்கிலிகள் வழியாக சறுக்கி பல எதிரிகளைப் பிடிக்க முடியும்.</p>
                    </div>
                `
            },
            minotaur: {
                title: "கோலெம்",
                content: `
                    <div class="card">
                        <h3>வகை: <span class="accent">வெல்ல முடியாதவர்</span></h3>
                        <p>இவரைப் பிடிக்க முடியாது, வெடிப்புகளால் பாதிக்கப்பட மாட்டார்.</p>
                    </div>
                `
            },
            witch: {
                title: "சூனியக்காரி",
                content: `
                    <div class="card">
                        <h3>வகை: <span class="accent">குதிப்பவர்</span></h3>
                        <p>குதித்தல் வரம்பு: <span class="highlight">4</span>.</p>
                    </div>
                `
            },
            global_overview: {
                title: "உலகளாவிய கண்ணோட்டம்",
                content: `
                    <p>அமைப்பு முடிந்தது. தெய்வம் பாதுகாக்கப்படுகிறது, வீரர்கள் தாக்குதலுக்குத் தயார்.</p>
                `
            }
        }
    },
    ar: {
        menu: {
            intro: "مقدمة",
            setup_phase: "مرحلة الإعداد",
            board: "اللوحة والتضاريس",
            turn: "ميكانيكا الدور",
            goddess: "الإلهة",
            heroe: "البطل",
            mage: "الساحر",
            siren: "سيرين",
            ghoul: "الغول",
            witch: "الساحرة",
            soldier: "الجندي",
            minotaur: "المينوتور",
            global_overview: "نظرة عامة"
        },
        sections: {
            intro: {
                title: "مقدمة",
                content: `
                    <div class="card">
                        <h2 style="margin-top: 0">الهدف</h2>
                        <p>الهدف الرئيسي هو <span class="accent">أسر إلهة الخصم</span>. تنتهي اللعبة فور إزالة الإلهة من اللوحة.</p>
                    </div>
                `
            },
            setup_phase: {
                title: "مرحلة الإعداد",
                content: `
                    <p>قبل بدء اللعب، يجب على اللاعبين توزيع قواتهم. يتم الإعداد في 5 خطوات:</p>
                    <ol class="setup-steps">
                        <li><h3 class="accent">1. الإلهة</h3><p>يجب وضعها على <span class="highlight">الحافة البعيدة</span> من جانبك.</p></li>
                        <li><h3 class="accent">2. الأبطال</h3><p>على الحواف، على بعد <span class="highlight">4 إلى 6 قفزات</span> من الإلهة.</p></li>
                        <li><h3 class="accent">3. الغولم</h3><p>دروع دفاعية بالقرب من الإلهة (1-2 قفزة).</p></li>
                        <li><h3 class="accent">4. الحلقة اللونية</h3><p>يتم توزيع <span class="accent">الساحرات</span> على 4 ألوان مختلفة.</p></li>
                        <li><h3 class="accent">5. نشر المشاة</h3><p><span class="accent">الغيلان</span> و <span class="accent">السيرين</span> تشغل المواقع التكتيكية المتبقية.</p></li>
                    </ol>
                `
            },
            board: {
                title: "اللوحة والتضاريس",
                content: `
                    <div class="card">
                        <h3><span class="accent">الانزلاق</span> (Slide)</h3>
                        <p>التحرك بين المضلعات التي تشترك في حافة. <span class="highlight">الحواف الحمراء تمنع الانزلاق</span>.</p>
                    </div>
                `
            },
            turn: {
                title: "ميكانيكا الدور",
                content: `
                    <p>اختر لونًا يسمح بحركة قانونية واحدة على الأقل. يمكن لجميع القطع من ذلك اللون التحرك.</p>
                `
            },
            goddess: {
                title: "الإلهة",
                content: `
                    <div class="card">
                        <h3>النوع: <span class="accent">قافزة</span></h3>
                        <p>مدى القفز: <span class="highlight">2</span>. أهم قطعة؛ إذا أُسرت، تخسر اللعبة.</p>
                    </div>
                `
            },
            heroe: {
                title: "البطل",
                content: `
                    <div class="card">
                        <h3>النوع: <span class="accent">قافز</span></h3>
                        <p>مدى القفز: <span class="highlight">3</span>. أسر العدو يسمح له <span class="highlight">بالقفز مجددًا فورًا</span>.</p>
                    </div>
                `
            },
            mage: {
                title: "الساحر",
                content: `
                    <div class="card">
                        <h3>خاص: <span class="accent">فتح القفل اللوني</span></h3>
                        <p>يكون الساحر <span class="highlight">مغلقًا</span> في البداية. يتم تفعيله بعد اختيار جميع الألوان الأربعة.</p>
                    </div>
                `
            },
            siren: {
                title: "سيرين",
                content: `
                    <div class="card">
                        <h3>خاص: <span class="accent">التثبيت</span></h3>
                        <p>قطع الأعداء <span class="highlight">المجاورة</span> للسيرين تصبح مثبتة ولا يمكنها التحرك.</p>
                    </div>
                `
            },
            ghoul: {
                title: "الغول",
                content: `
                    <div class="card">
                        <h3>النوع: <span class="accent">منزلق</span></h3>
                        <p>المدى: <span class="highlight">3</span>.</p>
                    </div>
                `
            },
            soldier: {
                title: "الجندي",
                content: `
                    <div class="card">
                        <h3>النوع: <span class="accent">منزلق</span></h3>
                        <p>ينزلق عبر سلاسل المضلعات ويمكنه أسر أعداء متعددين.</p>
                    </div>
                `
            },
            minotaur: {
                title: "الغولم",
                content: `
                    <div class="card">
                        <h3>النوع: <span class="accent">لا يقهر</span></h3>
                        <p>لا يمكن أسره ولا يتأثر بالانفجارات المحيطة.</p>
                    </div>
                `
            },
            witch: {
                title: "الساحرة",
                content: `
                    <div class="card">
                        <h3>النوع: <span class="accent">قافزة</span></h3>
                        <p>مدى القفز: <span class="highlight">4</span>.</p>
                    </div>
                `
            },
            global_overview: {
                title: "نظرة عامة",
                content: `
                    <p>اكتمل الإعداد. الإلهات محمية، والأبطال مستعدون للهجوم.</p>
                `
            }
        }
    },
    ur: {
        menu: {
            intro: "تعارف",
            setup_phase: "تیاری کا مرحلہ",
            board: "بورڈ اور ساخت",
            turn: "باری کے اصول",
            goddess: "دیوی",
            heroe: "ہیرو",
            mage: "جادوگر",
            siren: "سائرن",
            ghoul: "غول",
            witch: "جادوگرنی",
            soldier: "سپاہی",
            minotaur: "مینوتور",
            global_overview: "مجموعی جائزہ"
        },
        sections: {
            intro: {
                title: "تعارف",
                content: `
                    <div class="card">
                        <h2 style="margin-top: 0">مقصد</h2>
                        <p>بنیادی مقصد <span class="accent">مخالف کی دیوی کو پکڑنا</span> ہے۔ جیسے ہی دیوی بورڈ سے ہٹائی جاتی ہے، کھیل ختم ہو جاتا ہے۔</p>
                    </div>
                `
            },
            setup_phase: {
                title: "تیاری کا مرحلہ",
                content: `
                    <p>کھیل شروع ہونے سے پہلے، کھلاڑیوں کو اپنی فوج تعینات کرنی ہوگی۔ اس کے 5 مراحل ہیں:</p>
                    <ol class="setup-steps">
                        <li><h3 class="accent">1. دیوی</h3><p>اسے اپنے حصے کے <span class="highlight">دور ترین کنارے</span> پر رکھنا چاہیے۔</p></li>
                        <li><h3 class="accent">2. ہیرو</h3><p>دیوی سے <span class="highlight">4 سے 6 چھلانگوں</span> کے فاصلے پر۔</p></li>
                        <li><h3 class="accent">3. گولم</h3><p>دیوی کے قریب دفاعی ڈھال کے طور پر۔</p></li>
                        <li><h3 class="accent">4. رنگوں کا گھیرا</h3><p><span class="accent">جادوگرنیاں</span> 4 مختلف رنگوں پر تقسیم کی جاتی ہیں۔</p></li>
                        <li><h3 class="accent">5. پیادہ فوج</h3><p><span class="accent">غول</span> اور <span class="accent">سائرن</span> باقی جگہوں کو بھرتے ہیں۔</p></li>
                    </ol>
                `
            },
            board: {
                title: "بورڈ اور ساخت",
                content: `
                    <div class="card">
                        <h3><span class="accent">پھسلنا</span> (Slide)</h3>
                        <p>ایک کنارے والے خانوں کے درمیان چلنا۔ <span class="highlight">سرخ کنارے پھسلنے کو روکتے ہیں</span>۔</p>
                    </div>
                `
            },
            turn: {
                title: "باری کے اصول",
                content: `
                    <p>ایسا رنگ منتخب کریں جو کم از کم ایک قانونی چال کی اجازت دے۔</p>
                `
            },
            goddess: {
                title: "دیوی",
                content: `
                    <div class="card">
                        <h3>قسم: <span class="accent">چھلانگ لگانے والا</span></h3>
                        <p>حد: <span class="highlight">2</span>۔ سب سے اہم مہرہ۔</p>
                    </div>
                `
            },
            heroe: {
                title: "ہیرو",
                content: `
                    <div class="card">
                        <h3>قسم: <span class="accent">چھلانگ لگانے والا</span></h3>
                        <p>حد: <span class="highlight">3</span>۔ دشمن کو پکڑنے پر یہ <span class="highlight">فوری طور پر دوبارہ چھلانگ</span> لگا سکتا ہے۔</p>
                    </div>
                `
            },
            mage: {
                title: "جادوگر",
                content: `
                    <div class="card">
                        <h3>خاص: <span class="accent">رنگ کھلنا</span></h3>
                        <p>جادوگر شروع میں <span class="highlight">بند</span> ہوتا ہے۔</p>
                    </div>
                `
            },
            siren: {
                title: "سائرن",
                content: `
                    <div class="card">
                        <h3>خاص: <span class="accent">جکڑنا</span></h3>
                        <p>سائرن کے <span class="highlight">قریب</span> دشمن مہرے جکڑے جاتے ہیں۔</p>
                    </div>
                `
            },
            ghoul: {
                title: "غول",
                content: `
                    <div class="card">
                        <h3>قسم: <span class="accent">پھسلنے والا</span></h3>
                        <p>حد: <span class="highlight">3</span>۔</p>
                    </div>
                `
            },
            soldier: {
                title: "سپاہی",
                content: `
                    <div class="card">
                        <h3>قسم: <span class="accent">پھسلنے والا</span></h3>
                        <p>خانوں کے درمیان پھسلتا ہے اور دشمنوں کو پکڑتا ہے۔</p>
                    </div>
                `
            },
            minotaur: {
                title: "گولم",
                content: `
                    <div class="card">
                        <h3>قسم: <span class="accent">ناقابل تسخیر</span></h3>
                        <p>اسے پکڑا نہیں جا سکتا۔</p>
                    </div>
                `
            },
            witch: {
                title: "جادوگرنی",
                content: `
                    <div class="card">
                        <h3>قسم: <span class="accent">چھلانگ لگانے والا</span></h3>
                        <p>حد: <span class="highlight">4</span>۔</p>
                    </div>
                `
            },
            global_overview: {
                title: "مجموعی جائزہ",
                content: `
                    <p>تیاری مکمل ہوئی۔ دیویاں محفوظ ہیں اور ہیرو حملے کے لیے تیار ہیں۔</p>
                `
            }
        }
    },
    pt: {
        menu: {
            intro: "Introdução",
            setup_phase: "Fase de Preparação",
            board: "Tabuleiro e Topologia",
            turn: "Mecânicas de Turno",
            goddess: "A Deusa",
            heroe: "O Herói",
            mage: "O Mago",
            siren: "A Sereia",
            ghoul: "O Carniçal",
            witch: "A Bruxa",
            soldier: "O Soldado",
            minotaur: "O Minotaur",
            global_overview: "Visão Geral"
        },
        sections: {
            intro: {
                title: "Introdução",
                content: `
                    <div class="card">
                        <h2 style="margin-top: 0">O Objetivo</h2>
                        <p>O objetivo principal é <span class="accent">capturar a Deusa do oponente</span>. O jogo termina imediatamente quando uma Deusa é removida do tabuleiro.</p>
                    </div>
                `
            },
            setup_phase: {
                title: "Fase de Preparação",
                content: `
                    <p>Antes do início do jogo, os jogadores devem posicionar as suas forças. O posicionamento segue 5 passos:</p>
                    <ol class="setup-steps">
                        <li><h3 class="accent">1. A Deusa</h3><p>Deve ser colocada na <span class="highlight">borda distante</span> do seu lado.</p></li>
                        <li><h3 class="accent">2. Os Heróis</h3><p>Colocados nas bordas, entre <span class="highlight">4 a 6 saltos</span> de distância da Deusa.</p></li>
                        <li><h3 class="accent">3. Os Minotaurs</h3><p>Escudos defensivos perto da Deusa (1-2 saltos).</p></li>
                        <li><h3 class="accent">4. O Anel Cromático</h3><p>As <span class="accent">Bruxas</span> são distribuídas por 4 cores diferentes.</p></li>
                        <li><h3 class="accent">5. Destacamento de Infantaria</h3><p><span class="accent">Carniçais</span> e <span class="accent">Sereias</span> ocupam as restantes posições.</p></li>
                    </ol>
                `
            },
            board: {
                title: "Tabuleiro e Topologia",
                content: `
                    <div class="card">
                        <h3><span class="accent">Deslizar</span> (Slide)</h3>
                        <p>Movimento entre polígonos adjacentes. <span class="highlight">Bordas Vermelhas bloqueiam o deslizamento</span>.</p>
                    </div>
                `
            },
            turn: {
                title: "Mecânicas de Turno",
                content: `
                    <p>Escolha uma cor que permita pelo menos um movimento legal. Todas as peças dessa cor podem mover-se.</p>
                `
            },
            goddess: {
                title: "A Deusa",
                content: `
                    <div class="card">
                        <h3>Tipo: <span class="accent">Saltadora</span></h3>
                        <p>Alcance de Salto: <span class="highlight">2</span>. A peça mais vital.</p>
                    </div>
                `
            },
            heroe: {
                title: "O Herói",
                content: `
                    <div class="card">
                        <h3>Tipo: <span class="accent">Saltador</span></h3>
                        <p>Alcance de Salto: <span class="highlight">3</span>. Capturar um inimigo permite <span class="highlight">saltar novamente de imediato</span>.</p>
                    </div>
                `
            },
            mage: {
                title: "O Mago",
                content: `
                    <div class="card">
                        <h3>Especial: <span class="accent">Desbloqueio Cromático</span></h3>
                        <p>O Mago está <span class="highlight">Bloqueado</span> no início. Ativa após as 4 cores serem escolhidas.</p>
                    </div>
                `
            },
            siren: {
                title: "A Sereia",
                content: `
                    <div class="card">
                        <h3>Especial: <span class="accent">Ancoragem</span></h3>
                        <p>Inimigos <span class="highlight">adjacentes</span> à Sereia ficam ancorados e não se podem mover.</p>
                    </div>
                `
            },
            ghoul: {
                title: "O Carniçal",
                content: `
                    <div class="card">
                        <h3>Tipo: <span class="accent">Deslizador</span></h3>
                        <p>Alcance: <span class="highlight">3</span>.</p>
                    </div>
                `
            },
            soldier: {
                title: "O Soldado",
                content: `
                    <div class="card">
                        <h3>Tipo: <span class="accent">Deslizador</span></h3>
                        <p>Desliza através de polígonos e pode capturar múltiplos inimigos.</p>
                    </div>
                `
            },
            minotaur: {
                title: "O Minotaur",
                content: `
                    <div class="card">
                        <h3>Tipo: <span class="accent">Invulnerável</span></h3>
                        <p>Não pode ser capturado.</p>
                    </div>
                `
            },
            witch: {
                title: "A Bruxa",
                content: `
                    <div class="card">
                        <h3>Tipo: <span class="accent">Saltadora</span></h3>
                        <p>Alcance de Salto: <span class="highlight">4</span>.</p>
                    </div>
                `
            },
            global_overview: {
                title: "Visão Geral",
                content: `
                    <p>Preparação concluída. As Deusas estão protegidas e os heróis prontos para o ataque.</p>
                `
            }
        }
    },
    ru: {
        menu: {
            intro: "Введение",
            setup_phase: "Фаза расстановки",
            board: "Поле и топология",
            turn: "Механика хода",
            goddess: "Богиня",
            heroe: "Герой",
            mage: "Маг",
            siren: "Сирена",
            ghoul: "Гуль",
            witch: "Ведьма",
            soldier: "Солдат",
            minotaur: "Минотавр",
            global_overview: "Общий обзор"
        },
        sections: {
            intro: {
                title: "Введение",
                content: `
                    <div class="card">
                        <h2 style="margin-top: 0">Цель игры</h2>
                        <p>Главная цель — <span class="accent">захватить Богиню противника</span>. Игра заканчивается сразу, как только Богиня удаляется с поля.</p>
                    </div>
                `
            },
            setup_phase: {
                title: "Фаза расстановки",
                content: `
                    <p>Перед началом игры игроки должны расставить свои силы. Расстановка проходит в 5 этапов:</p>
                    <ol class="setup-steps">
                        <li><h3 class="accent">1. Богиня</h3><p>Должна быть размещена на <span class="highlight">дальнем краю</span> вашего поля.</p></li>
                        <li><h3 class="accent">2. Герои</h3><p>Размещаются по краям, в <span class="highlight">4-6 прыжках</span> от Богини.</p></li>
                        <li><h3 class="accent">3. Големы</h3><p>Защитные щиты рядом с Богиней (1-2 прыжка).</p></li>
                        <li><h3 class="accent">4. Хроматическое кольцо</h3><p><span class="accent">Ведьмы</span> распределяются по 4 разным цветам.</p></li>
                        <li><h3 class="accent">5. Развертывание пехоты</h3><p><span class="accent">Гули</span> и <span class="accent">Сирены</span> занимают оставшиеся позиции.</p></li>
                    </ol>
                `
            },
            board: {
                title: "Поле и топология",
                content: `
                    <div class="card">
                        <h3><span class="accent">Скольжение</span> (Slide)</h3>
                        <p>Движение между многоугольниками с общим ребром. <span class="highlight">Красные ребра блокируют скольжение</span>.</p>
                    </div>
                `
            },
            turn: {
                title: "Механика хода",
                content: `
                    <p>Выберите цвет, позволяющий сделать хотя бы один ход. Все фигуры этого цвета могут ходить.</p>
                `
            },
            goddess: {
                title: "Богиня",
                content: `
                    <div class="card">
                        <h3>Тип: <span class="accent">Прыгун</span></h3>
                        <p>Дальность прыжка: <span class="highlight">2</span>. Самая важная фигура.</p>
                    </div>
                `
            },
            heroe: {
                title: "Герой",
                content: `
                    <div class="card">
                        <h3>Тип: <span class="accent">Прыгун</span></h3>
                        <p>Дальность прыжка: <span class="highlight">3</span>. Захват врага позволяет <span class="highlight">сразу прыгнуть снова</span>.</p>
                    </div>
                `
            },
            mage: {
                title: "Маг",
                content: `
                    <div class="card">
                        <h3>Особенности: <span class="accent">Хроматическая разблокировка</span></h3>
                        <p>Маг в начале <span class="highlight">Заблокирован</span>. Активируется после выбора всех 4 цветов.</p>
                    </div>
                `
            },
            siren: {
                title: "Сирена",
                content: `
                    <div class="card">
                        <h3>Особенности: <span class="accent">Остановка</span></h3>
                        <p>Враги <span class="highlight">рядом</span> с Сиреной не могут двигаться.</p>
                    </div>
                `
            },
            ghoul: {
                title: "Гуль",
                content: `
                    <div class="card">
                        <h3>Тип: <span class="accent">Скользящий</span></h3>
                        <p>Дальность: <span class="highlight">3</span>.</p>
                    </div>
                `
            },
            soldier: {
                title: "Солдат",
                content: `
                    <div class="card">
                        <h3>Тип: <span class="accent">Скользящий</span></h3>
                        <p>Скользит сквоيل цепочки многоугольников.</p>
                    </div>
                `
            },
            minotaur: {
                title: "Голем",
                content: `
                    <div class="card">
                        <h3>Тип: <span class="accent">Неуязвимый</span></h3>
                        <p>Его нельзя захватить.</p>
                    </div>
                `
            },
            witch: {
                title: "Ведьма",
                content: `
                    <div class="card">
                        <h3>Тип: <span class="accent">Прыгун</span></h3>
                        <p>Дальность прыжка: <span class="highlight">4</span>.</p>
                    </div>
                `
            },
            global_overview: {
                title: "Общий обзор",
                content: `
                    <p>Расстановка завершена. Богини под защитой, герои готовы к бою.</p>
                `
            }
        }
    },
    bn: {
        menu: {
            intro: "ভূমিকা",
            setup_phase: "প্রস্তুতি পর্ব",
            board: "বোর্ড এবং টপোলজি",
            turn: "চালানোর নিয়ম",
            goddess: "দেবী",
            heroe: "বীর",
            mage: "জাদুকর",
            siren: "সাইরেন",
            ghoul: "পিশাচ",
            witch: "ডাইনি",
            soldier: "সৈনিক",
            minotaur: "মিনোটর",
            global_overview: "সার্বিক চিত্র"
        },
        sections: {
            intro: {
                title: "ভূমিকা",
                content: `
                    <div class="card">
                        <h2 style="margin-top: 0">লক্ষ্য</h2>
                        <p>প্রধান লক্ষ্য হলো <span class="accent">প্রতিপক্ষের দেবীকে বন্দী করা</span>। দেবী বোর্ড থেকে অপসারিত হওয়া মাত্র খেলা শেষ হয়ে যায়।</p>
                    </div>
                `
            },
            setup_phase: {
                title: "প্রস্তুতি পর্ব",
                content: `
                    <p>খেলা শুরুর আগে খেলোয়াড়দের তাদের বাহিনী মোতায়েন করতে হবে। এটি ৫টি ধাপে করা হয়:</p>
                    <ol class="setup-steps">
                        <li><h3 class="accent">১. দেবী</h3><p>আপনার পক্ষের <span class="highlight">সবচেয়ে দূরের প্রান্তে</span> রাখতে হবে।</p></li>
                        <li><h3 class="accent">২. বীর</h3><p>দেবী থেকে <span class="highlight">৪ থেকে ৬ লাফ</span> দূরত্বে।</p></li>
                        <li><h3 class="accent">৩. গোলেম</h3><p>দেবীর কাছে প্রতিরক্ষা ঢাল হিসেবে (১-২ লাফ)।</p></li>
                        <li><h3 class="accent">৪. রঙের বৃত্ত</h3><p><span class="accent">ডাইনিরা</span> ৪টি ভিন্ন রঙে বিন্যস্ত থাকে।</p></li>
                        <li><h3 class="accent">৫. পদাতিক বাহিনী</h3><p><span class="accent">পিশাচ</span> এবং <span class="accent">সাইরেন</span> বাকি কৌশলগত স্থানগুলি পূরণ করে।</p></li>
                    </ol>
                `
            },
            board: {
                title: "বোর্ড এবং টপোলজি",
                content: `
                    <div class="card">
                        <h3><span class="accent">পিচ্ছিল চাল</span> (Slide)</h3>
                        <p>একই প্রান্তযুক্ত বহুভুজের মধ্যে চলাচল। <span class="highlight">লাল প্রান্তগুলি পিচ্ছিল চলন বাধা দেয়</span>।</p>
                    </div>
                `
            },
            turn: {
                title: "চালানোর নিয়ম",
                content: `
                    <p>একটি রঙ চয়ন করুন যা অন্তত একটি বৈধ চালের অনুমতি দেয়। সেই রঙের সকল ঘুঁটি চলতে পারবে।</p>
                `
            },
            goddess: {
                title: "দেবী",
                content: `
                    <div class="card">
                        <h3>ধরণ: <span class="accent">লাফ প্রদানকারী</span></h3>
                        <p>লাফানোর সীমা: <span class="highlight">২</span>। সবচেয়ে গুরুত্বপূর্ণ ঘুঁটি।</p>
                    </div>
                `
            },
            heroe: {
                title: "বীর",
                content: `
                    <div class="card">
                        <h3>ধরণ: <span class="accent">লাফ প্রদানকারী</span></h3>
                        <p>লাফানোর সীমা: <span class="highlight">৩</span>। শত্রুকে ধরলে এটি <span class="highlight">অবিলম্বে আবার লাফ দিতে পারে</span>।</p>
                    </div>
                `
            },
            mage: {
                title: "জাদুকর",
                content: `
                    <div class="card">
                        <h3>বিশেষ: <span class="accent">রঙ আনলক</span></h3>
                        <p>জাদুকর শুরুতে <span class="highlight">লক</span> থাকে। ৪টি রঙ চয়ন করা হয়ে গেলে এটি সক্রিয় হয়।</p>
                    </div>
                `
            },
            siren: {
                title: "সাইরেন",
                content: `
                    <div class="card">
                        <h3>বিশেষ: <span class="accent">অ্যাঙ্করিং</span></h3>
                        <p>সাইরেনের <span class="highlight">পার্শ্ববর্তী</span> শত্রু ঘুঁটিগুলি স্থির হয়ে যায় এবং চলতে পারে না।</p>
                    </div>
                `
            },
            ghoul: {
                title: "পিশাচ",
                content: `
                    <div class="card">
                        <h3>ধরণ: <span class="accent">পিচ্ছিল চলনশীল</span></h3>
                        <p>সীমা: <span class="highlight">৩</span>।</p>
                    </div>
                `
            },
            soldier: {
                title: "সৈনিক",
                content: `
                    <div class="card">
                        <h3>ধরণ: <span class="accent">পিচ্ছিল চলনশীল</span></h3>
                        <p>বহুভুজ শৃঙ্খলের মধ্য দিয়ে পিচ্ছিলভাবে চলে এবং একাধিক শত্রুকে ধরতে পারে।</p>
                    </div>
                `
            },
            minotaur: {
                title: "গোলেম",
                content: `
                    <div class="card">
                        <h3>ধরণ: <span class="accent">অজেয়</span></h3>
                        <p>একে ধরা যায় না এবং বিষ্ফোরণে আক্রান্ত হয় না।</p>
                    </div>
                `
            },
            witch: {
                title: "ডাইনি",
                content: `
                    <div class="card">
                        <h3>ধরণ: <span class="accent">লাফ প্রদানকারী</span></h3>
                        <p>লাফানোর সীমা: <span class="highlight">৪</span>।</p>
                    </div>
                `
            },
            global_overview: {
                title: "সার্বিক চিত্র",
                content: `
                    <p>প্রস্তুতি সম্পন্ন। দেবী সুরক্ষিত এবং বীররা আক্রমণের জন্য প্রস্তুত।</p>
                `
            }
        }
    },
    id: {
        menu: {
            intro: "Pendahuluan",
            setup_phase: "Fase Persiapan",
            board: "Papan & Topologi",
            turn: "Mekanik Giliran",
            goddess: "Dewi",
            heroe: "Pahlawan",
            mage: "Penyihir Agung",
            siren: "Siren",
            ghoul: "Ghoul",
            witch: "Penyihir",
            soldier: "Prajurit",
            minotaur: "Minotaur",
            global_overview: "Ikhtisar Global"
        },
        sections: {
            intro: {
                title: "Pendahuluan",
                content: `
                    <div class="card">
                        <h2 style="margin-top: 0">Tujuan</h2>
                        <p>Tujuan utama adalah untuk <span class="accent">menangkap Dewi lawan</span>. Permainan berakhir segera setelah Dewi dikeluarkan dari papan.</p>
                    </div>
                `
            },
            setup_phase: {
                title: "Fase Persiapan",
                content: `
                    <p>Sebelum fase permainan dimulai, pemain harus mengatur kekuatan mereka. Penempatan dilakukan dalam 5 langkah:</p>
                    <ol class="setup-steps">
                        <li><h3 class="accent">1. Dewi</h3><p>Harus ditempatkan di <span class="highlight">tepi jauh</span> sisi Anda.</p></li>
                        <li><h3 class="accent">2. Pahlawan</h3><p>Ditempatkan di tepi, berjarak <span class="highlight">4 hingga 6 lompatan</span> dari Dewi.</p></li>
                        <li><h3 class="accent">3. Minotaur</h3><p>Sebagai perisai pertahanan di dekat Dewi (1-2 lompatan).</p></li>
                        <li><h3 class="accent">4. Lingkaran Kromatik</h3><p><span class="accent">Penyihir</span> didistribusikan pada 4 warna yang berbeda.</p></li>
                        <li><h3 class="accent">5. Pengerahan Infanteri</h3><p><span class="accent">Ghoul</span> dan <span class="accent">Siren</span> menempati posisi taktis yang tersisa.</p></li>
                    </ol>
                `
            },
            board: {
                title: "Papan & Topologi",
                content: `
                    <div class="card">
                        <h3><span class="accent">Geser</span> (Slide)</h3>
                        <p>Bergerak di antara poligon yang berbagi tepi. <span class="highlight">Tepi Merah menghalangi pergerakan geser</span>.</p>
                    </div>
                `
            },
            turn: {
                title: "Mekanik Giliran",
                content: `
                    <p>Pilih warna yang memungkinkan setidaknya satu langkah sah. Semua bidak dengan warna tersebut dapat bergerak.</p>
                `
            },
            goddess: {
                title: "Dewi",
                content: `
                    <div class="card">
                        <h3>Tipe: <span class="accent">Pelompat</span></h3>
                        <p>Jangkauan Lompat: <span class="highlight">2</span>. Bidak paling vital.</p>
                    </div>
                `
            },
            heroe: {
                title: "Pahlawan",
                content: `
                    <div class="card">
                        <h3>Tipe: <span class="accent">Pelompat</span></h3>
                        <p>Jangkauan Lompat: <span class="highlight">3</span>. Menangkap musuh memungkinkan <span class="highlight">melompat lagi segera</span>.</p>
                    </div>
                `
            },
            mage: {
                title: "Penyihir Agung",
                content: `
                    <div class="card">
                        <h3>Spesial: <span class="accent">Buka Kunci Kromatik</span></h3>
                        <p>Penyihir Agung <span class="highlight">Terkunci</span> pada awalnya. Aktif setelah 4 warna dipilih.</p>
                    </div>
                `
            },
            siren: {
                title: "Siren",
                content: `
                    <div class="card">
                        <h3>Spesial: <span class="accent">Penjangkaran</span></h3>
                        <p>Musuh yang <span class="highlight">berdekatan</span> dengan Siren akan terjangkar dan tidak bisa bergerak.</p>
                    </div>
                `
            },
            ghoul: {
                title: "Ghoul",
                content: `
                    <div class="card">
                        <h3>Tipe: <span class="accent">Penggeser</span></h3>
                        <p>Jangkauan: <span class="highlight">3</span>.</p>
                    </div>
                `
            },
            soldier: {
                title: "Prajurit",
                content: `
                    <div class="card">
                        <h3>Tipe: <span class="accent">Penggeser</span></h3>
                        <p>Menggeser melalui rantai poligon dan dapat menangkap banyak musuh.</p>
                    </div>
                `
            },
            minotaur: {
                title: "Minotaur",
                content: `
                    <div class="card">
                        <h3>Tipe: <span class="accent">Kebal</span></h3>
                        <p>Tidak bisa ditangkap.</p>
                    </div>
                `
            },
            witch: {
                title: "Penyihir",
                content: `
                    <div class="card">
                        <h3>Tipe: <span class="accent">Pelompat</span></h3>
                        <p>Jangkauan Lompat: <span class="highlight">4</span>.</p>
                    </div>
                `
            },
            global_overview: {
                title: "Ikhtisar Global",
                content: `
                    <p>Persiapan selesai. Dewi dilindungi dan pahlawan siap menyerang.</p>
                `
            }
        }
    }
};

export default translations;
