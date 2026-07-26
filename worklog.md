---
Task ID: 1
Agent: Main Agent
Task: Improve Roue de la Chance platform with festive UX, code queue system, 3D wheel, confetti, sector configuration

Work Log:
- Updated Prisma schema to add imageUrl, sectorPosition, quantity to Prize model, and sectorCount, losingSectorCount, soundEnabled to WheelConfig model
- Ran db:push and db:generate to sync database
- Installed canvas-confetti package for celebration effects
- Updated TypeScript types (Prize, WheelConfig, SessionCode, WheelSector types)
- Updated app store with session code queue (addSessionCode, removeSessionCode, availableSpins), sound toggle
- Rewrote page.tsx with festive dark theme (gradient background), gold/red themed navigation
- Rewrote wheel-view.tsx: code queue system (add codes to session, each valid code = 1 spin), code validation dialog, spin button with availableSpins counter, session codes display
- Rewrote spin-wheel.tsx: Canvas-based wheel with 3D shadows, gold rim, gradient sectors, 3D center circle, animated decorative lights, pointer with gradient, losing sectors show 😔 emoji
- Rewrote spin-result.tsx: Win celebration with confetti bursts (canvas-confetti), sparkle effects, rotating light rays, prize image zoom animation, "Présentez ce résultat à la caisse" message; Lose result shows 😔 with "Merci pour votre participation. À bientôt !"
- Rewrote spin-form.tsx: Optional participant info form
- Updated prize-panel.tsx: Added imageUrl, icon, quantity fields in create/edit dialogs
- Rewrote wheel-config-panel.tsx: Added sectorCount and losingSectorCount configuration, sector layout preview with position table, sound toggle, color configuration
- Updated spin API route: Sector-based wheel calculation (losingSectorCount losing sectors, rest winning), targetSectorIndex for animation, isWinning instead of isLosing
- Updated codes API route: Default result to "losing" (Perdant) per user spec
- Updated code-panel.tsx: Default generateData.result to "losing"
- Added CSS animations (zoomIn, fadeInUp, sparkle) to globals.css
- Lint check passes cleanly

Stage Summary:
- Complete overhaul of the Roue de la Chance platform with festive, modern UX
- Ticket-based outcome system (no probability): tickets carry gagnant/perdant status, wheel just animates
- Session-based code queue: users add multiple codes, each spin consumes one
- 3D wheel with Canvas rendering: shadows, gradients, gold rim, animated lights
- Confetti celebration effects on winning (canvas-confetti library)
- 10-sector wheel with configurable losing sector count (2, 3, 4, etc.)
- Prize model enhanced with imageUrl, quantity, sectorPosition
- Code generation defaults to "Perdant" status
- Sound toggle support
- All API routes updated for new fields
