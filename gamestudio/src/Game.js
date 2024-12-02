import React, { useState, useEffect, useRef } from 'react';
import './Game.css';

const GRID_WIDTH = 15;
const GRID_HEIGHT = 10;

const BLOCK_TYPES = {
    platform: { name: 'Platform', className: 'platform' },
    coin: { name: 'Munt', className: 'coin' },
    empty: { name: 'Leeg', className: '' },
};

const Cell = ({ x, y, type, className, onClick, onFocus, onKeyDown }) => (
    <div
        className={`cell ${className}`}
        tabIndex="0"
        role="gridcell"
        aria-rowindex={y + 1}
        aria-colindex={x + 1}
        aria-label={`${type} op rij ${y + 1}, kolom ${x + 1}`}
        onClick={() => onClick(x, y)}
        onFocus={() => onFocus(x, y)}
        onKeyDown={(e) => onKeyDown(e, x, y)}
    />
);

const Game = () => {
    const [grid, setGrid] = useState([]);
    const [mode, setMode] = useState('edit');
    const [selectedBlock, setSelectedBlock] = useState('platform');
    const [playerPos, setPlayerPos] = useState({ x: 0, y: GRID_HEIGHT - 2 });
    const [isGameLoopRunning, setIsGameLoopRunning] = useState(false);
    const [jumpVelocity, setJumpVelocity] = useState(0);
    const [isJumping, setIsJumping] = useState(false);
    const [initialJumpY, setInitialJumpY] = useState(0);
    const [horizontalDirection, setHorizontalDirection] = useState(0);
    const statusRef = useRef(null);

    useEffect(() => {
        setupGrid();
    }, []);

    useEffect(() => {
        if (isGameLoopRunning) {
            gameLoop();
        }
    }, [isGameLoopRunning, horizontalDirection, jumpVelocity]);

    const setupGrid = () => {
        const newGrid = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
            const row = [];
            for (let x = 0; x < GRID_WIDTH; x++) {
                row.push({ x, y, type: 'empty', className: '' });
            }
            newGrid.push(row);
        }
        for (let x = 0; x < GRID_WIDTH; x++) {
            newGrid[GRID_HEIGHT - 1][x] = { x, y: GRID_HEIGHT - 1, type: 'platform', className: 'platform' };
        }
        setGrid(newGrid);
    };

    const selectBlock = (blockType) => {
        setSelectedBlock(blockType);
        announce(`${BLOCK_TYPES[blockType].name} geselecteerd als bouwblok`);
    };

    const placeBlock = (x, y) => {
        if (mode === 'edit') {
            if (y === GRID_HEIGHT - 1 && selectedBlock !== 'empty') {
                announce("De grond kan niet bewerkt worden");
                return;
            }

            const newGrid = [...grid];
            newGrid[y][x] = { x, y, type: selectedBlock, className: BLOCK_TYPES[selectedBlock].className };
            setGrid(newGrid);
            announce(`${BLOCK_TYPES[selectedBlock].name} geplaatst op rij ${y + 1}, kolom ${x + 1}`);
        }
    };

    const handleCellKeydown = (e, x, y) => {
        if (mode === 'edit') {
            switch (e.key) {
                case 'ArrowLeft':
                    if (x > 0) grid[y][x - 1].element.focus();
                    break;
                case 'ArrowRight':
                    if (x < GRID_WIDTH - 1) grid[y][x + 1].element.focus();
                    break;
                case 'ArrowUp':
                    if (y > 0) grid[y - 1][x].element.focus();
                    break;
                case 'ArrowDown':
                    if (y < GRID_HEIGHT - 1) grid[y + 1][x].element.focus();
                    break;
                case 'Enter':
                case ' ':
                    placeBlock(x, y);
                    break;
                default:
                    break;
            }
        } else {
            switch (e.key) {
                case 'ArrowLeft':
                    setHorizontalDirection(-1);
                    movePlayer(-1, 0);
                    break;
                case 'ArrowRight':
                    setHorizontalDirection(1);
                    movePlayer(1, 0);
                    break;
                case 'ArrowUp':
                case ' ':
                    jump();
                    break;
                default:
                    break;
            }
        }
    };

    const toggleMode = () => {
        if (mode === 'edit') {
            startGame();
        }
        setMode((prevMode) => (prevMode === 'edit' ? 'play' : 'edit'));
        announce(`${mode === 'edit' ? 'Editor' : 'Speel'} modus geactiveerd`);
    };

    const startGame = () => {
        setPlayerPos({ x: 0, y: GRID_HEIGHT - 2 });
        setIsGameLoopRunning(true);
    };

    const movePlayer = (dx, dy) => {
        setGrid((prevGrid) => {
            const newGrid = [...prevGrid];
            const { x, y } = playerPos;

            const newX = x + dx;
            const newY = y + dy;

            if (newX >= 0 && newX < GRID_WIDTH && newY >= 0 && newY < GRID_HEIGHT) {
                newGrid[y][x] = { ...newGrid[y][x], type: 'empty', className: '' };
                newGrid[newY][newX] = { ...newGrid[newY][newX], type: 'player', className: 'player' };
                setPlayerPos({ x: newX, y: newY });
                announce(`Speler op rij ${newY + 1}, kolom ${newX + 1}`);
            }

            return newGrid;
        });
    };

    const jump = () => {
        if (!isJumping) {
            setIsJumping(true);
            setInitialJumpY(playerPos.y);
            setJumpVelocity(-6);
        }
    };

    const gameLoop = () => {
        if (mode !== 'play') return;

        if (isJumping) {
            setJumpVelocity((prevVelocity) => prevVelocity + 0.5);
            movePlayer(0, jumpVelocity);
            if (playerPos.y - initialJumpY >= 2) {
                setIsJumping(false);
                setJumpVelocity(0);
            }
        }

        if (!isJumping && grid[playerPos.y + 1] && grid[playerPos.y + 1][playerPos.x].type === 'empty') {
            movePlayer(0, 1);
        }

        if (horizontalDirection !== 0) {
            movePlayer(horizontalDirection, 0);
        }

        requestAnimationFrame(gameLoop);
    };

    const announce = (message) => {
        const statusElement = statusRef.current;
        if (statusElement) {
            statusElement.innerText = message;
            statusElement.setAttribute('aria-live', 'polite');
        }
    };

    const handleCellClick = (x, y) => {
        placeBlock(x, y);
    };

    const handleCellFocus = (x, y) => {
        announce(`Rij ${y + 1}, kolom ${x + 1}`);
    };

    return (
        <div id="game-container">
            <h1>Gamestudio</h1>
            <div className="block-categories">
                {Object.keys(BLOCK_TYPES).map((blockType) => (
                    <button
                        key={blockType}
                        className={`category ${selectedBlock === blockType ? 'active' : ''}`}
                        onClick={() => selectBlock(blockType)}
                    >
                        {BLOCK_TYPES[blockType].name}
                    </button>
                ))}
            </div>
            <div className="game-controls">
                <button onClick={toggleMode}>
                    {mode === 'edit' ? 'Speel Level' : 'Wissel naar Editor Modus'}
                </button>
            </div>
            <div className="game-grid" role="grid" aria-label="Level Grid">
                {grid.map((row, rowIndex) => (
                    <div key={rowIndex} className="row" role="row">
                        {row.map((cell, cellIndex) => (
                            <Cell
                                key={`${rowIndex}-${cellIndex}`}
                                x={cell.x}
                                y={cell.y}
                                type={cell.type}
                                className={cell.className}
                                onClick={handleCellClick}
                                onFocus={handleCellFocus}
                                onKeyDown={handleCellKeydown}
                            />
                        ))}
                    </div>
                ))}
            </div>
            <div id="status" ref={statusRef} aria-live="polite"></div>
        </div>
    );
};

export default Game;
