import React, { useState, useEffect, useCallback } from 'react';
import './Game.css';

const GRID_WIDTH = 15;
const GRID_HEIGHT = 10;

const BLOCK_CATEGORIES = {
    vast: {
        name: 'Vast',
        blocks: [
            { id: 'wall', name: 'Muur', className: 'wall', solid: true },
            { id: 'water', name: 'Water', className: 'water', hazard: true },
            { id: 'grass', name: 'Gras', className: 'grass' }
        ]
    },
    interactief: {
        name: 'Interactief',
        blocks: [
            { id: 'door', name: 'Deur', className: 'door', interactive: true },
            { id: 'key', name: 'Sleutel', className: 'key', collectible: true }
        ]
    },
    items: {
        name: 'Items',
        blocks: [
            { id: 'coin', name: 'Munt', className: 'coin', collectible: true, points: 10 },
            { id: 'gem', name: 'Diamant', className: 'gem', collectible: true, points: 50 }
        ]
    }
};

const Game = () => {
    const [grid, setGrid] = useState([]);
    const [mode, setMode] = useState('edit');
    const [selectedBlock, setSelectedBlock] = useState(null);
    const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [status, setStatus] = useState('');

    // Initialize grid
    useEffect(() => {
        const newGrid = Array(GRID_HEIGHT).fill().map(() =>
            Array(GRID_WIDTH).fill().map(() => ({
                type: 'empty',
                className: '',
                properties: {}
            }))
        );
        setGrid(newGrid);
    }, []);

    const announce = (message) => {
        setStatus(message);
    };

    const placeBlock = useCallback((x, y) => {
        if (!selectedBlock) return;

        setGrid(prevGrid => {
            const newGrid = [...prevGrid];
            newGrid[y] = [...newGrid[y]];
            newGrid[y][x] = {
                type: selectedBlock.id,
                className: selectedBlock.className,
                properties: { ...selectedBlock }
            };
            return newGrid;
        });

        announce(`${selectedBlock.name} geplaatst op rij ${y + 1}, kolom ${x + 1}`);
    }, [selectedBlock]);

    const movePlayer = useCallback((dx, dy) => {
        if (mode !== 'play') return;

        setPlayerPos(prev => {
            const newX = prev.x + dx;
            const newY = prev.y + dy;

            // Check boundaries
            if (newX < 0 || newX >= GRID_WIDTH || newY < 0 || newY >= GRID_HEIGHT) {
                return prev;
            }

            // Check collision
            const targetCell = grid[newY][newX];
            if (targetCell.properties.solid) {
                return prev;
            }

            // Handle collectibles
            if (targetCell.properties.collectible) {
                setScore(s => s + (targetCell.properties.points || 0));
                setGrid(prevGrid => {
                    const newGrid = [...prevGrid];
                    newGrid[newY] = [...newGrid[newY]];
                    newGrid[newY][newX] = {
                        type: 'empty',
                        className: '',
                        properties: {}
                    };
                    return newGrid;
                });
            }

            // Handle hazards
            if (targetCell.properties.hazard) {
                setLives(l => l - 1);
                return { x: 0, y: 0 }; // Reset position
            }

            announce(`Speler op positie ${newY + 1}, ${newX + 1}`);
            return { x: newX, y: newY };
        });
    }, [mode, grid]);

    const handleKeyDown = useCallback((e) => {
        if (mode === 'play') {
            switch (e.key) {
                case 'ArrowUp':
                    movePlayer(0, -1);
                    break;
                case 'ArrowDown':
                    movePlayer(0, 1);
                    break;
                case 'ArrowLeft':
                    movePlayer(-1, 0);
                    break;
                case 'ArrowRight':
                    movePlayer(1, 0);
                    break;
                default:
                    break;
            }
        }
    }, [mode, movePlayer]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const renderGrid = () => {
        return grid.map((row, y) => (
            <div key={y} className="row" role="row">
                {row.map((cell, x) => (
                    <div
                        key={`${x}-${y}`}
                        className={`cell ${cell.className}`}  // Verwijder player class hier
                        onClick={() => mode === 'edit' && placeBlock(x, y)}
                        role="gridcell"
                        aria-row={y}
                        aria-col={x}
                        tabIndex={0}
                    >
                        {playerPos.x === x && playerPos.y === y && (
                            <div className="player" />
                        )}
                    </div>
                ))}
            </div>
        ));
    };

    return (
        <div className="game-container">
            <div className="game-header">
                <div className="stats">
                    <span role="status">Levens: {lives}</span>
                    <span role="status">Score: {score}</span>
                </div>
                <button 
                    onClick={() => setMode(m => m === 'edit' ? 'play' : 'edit')}
                    className="mode-toggle"
                >
                    {mode === 'edit' ? 'Speel' : 'Bewerk'}
                </button>
            </div>

            <div className="block-categories">
                {Object.entries(BLOCK_CATEGORIES).map(([key, category]) => (
                    <div key={key} className="category">
                        <h3>{category.name}</h3>
                        <div className="blocks">
                            {category.blocks.map(block => (
                                <div
                                    key={block.id}
                                    className={`block-option ${block.className} ${selectedBlock?.id === block.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedBlock(block)}
                                    role="button"
                                    aria-label={block.name}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="game-grid" role="grid" aria-label="Speelveld">
                {renderGrid()}
            </div>

            <div className="status" role="status" aria-live="polite">
                {status}
            </div>
        </div>
    );
};

export default Game;