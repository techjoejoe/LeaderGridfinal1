
"use client";

import { Header } from "@/components/header";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Button } from "@/components/ui/button";
import { Settings, X, Share2, Monitor, Shuffle, Scale, Undo, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import Papa from "papaparse";

// Sound System using Web Audio API
class SoundEffects {
    private audioContext: AudioContext | null = null;
    private spinningInterval: NodeJS.Timeout | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            try {
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                this.audioContext = new AudioContext();
            } catch (e) {
                console.warn('Web Audio API not supported');
            }
        }
    }

    private playSound(type: OscillatorType, frequency: number, duration: number, volume: number) {
        if (!this.audioContext) return;
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        osc.type = type;
        osc.frequency.value = frequency;
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, this.audioContext.currentTime + duration);
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + duration);
    }
    
    playClick() { this.playSound('sine', 600, 0.1, 0.3); }
    playTick() { this.playSound('square', 400 + Math.random() * 200, 0.05, 0.1); }
    playSpinStart() { this.playSound('sawtooth', 200, 0.3, 0.2); }
    
    playWinner() {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C
        notes.forEach((freq, index) => {
            setTimeout(() => this.playSound('sine', freq, 0.5, 0.3), index * 100);
        });
    }

    startSpinning() {
        this.stopSpinning();
        const spinDuration = 5700;
        const startTime = Date.now();
        const playTick = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= spinDuration) { this.stopSpinning(); return; }
            this.playTick();
            const progress = elapsed / spinDuration;
            const delay = progress < 0.2 ? 120 - (progress * 400) : progress < 0.7 ? 35 : 35 + Math.pow((progress - 0.7) / 0.3, 2) * 250;
            this.spinningInterval = setTimeout(playTick, Math.max(delay, 20));
        };
        playTick();
    }

    stopSpinning() {
        if (this.spinningInterval) clearTimeout(this.spinningInterval);
        this.spinningInterval = null;
    }
}

type Item = { name: string; team?: string; teamNumber?: number };
type Winner = { name: string; time: string };
type UndoState = { items: Item[], winners: Winner[] };

const RandomizerWheel = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [currentRotation, setCurrentRotation] = useState(0);
    const [recentWinners, setRecentWinners] = useState<Winner[]>([]);
    const [undoHistory, setUndoHistory] = useState<UndoState[]>([]);
    const [settings, setSettings] = useState({ removeWinner: false, soundEnabled: true });
    const [currentMode, setCurrentMode] = useState<'normal' | 'team'>('normal');
    const [numberOfTeams, setNumberOfTeams] = useState(2);
    const [isPresentationMode, setIsPresentationMode] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [resultText, setResultText] = useState("Add items to get started");
    const [shareLink, setShareLink] = useState("");
    const [theme, setTheme] = useState('dark');
    const [wheelSize, setWheelSize] = useState('medium');

    const wheelRef = useRef<HTMLDivElement>(null);
    const textInputRef = useRef<HTMLTextAreaElement>(null);
    const teamAddInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const soundEffects = useRef(new SoundEffects());
    
    const teamColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57'];
    const teamColorSets = [
        ['#FF6B6B', '#FF5252', '#FF7979', '#FF4444'], // Team 1 - Reds
        ['#4ECDC4', '#44A08D', '#5ED4CB', '#3A9B89'], // Team 2 - Teals
        ['#45B7D1', '#2196F3', '#56C4DD', '#1E88E5'], // Team 3 - Blues
        ['#96CEB4', '#4CAF50', '#A4D6BC', '#45A049'], // Team 4 - Greens
        ['#FECA57', '#FF9800', '#FFD166', '#FB8C00']  // Team 5 - Yellows/Oranges
    ];

    const saveUndoState = useCallback(() => {
        setUndoHistory(prev => {
            const newState = { items: JSON.parse(JSON.stringify(items)), winners: [...recentWinners] };
            const newHistory = [...prev, newState];
            return newHistory.length > 10 ? newHistory.slice(1) : newHistory;
        });
    }, [items, recentWinners]);

    const showResult = useCallback((text: string) => {
        setResultText(text);
        const el = document.getElementById('resultText');
        if(el) {
            el.classList.remove('show');
            void el.offsetWidth; // trigger reflow
            el.classList.add('show');
        }
    }, []);

    const addTextItems = useCallback(() => {
        const text = textInputRef.current?.value.trim();
        if (text) {
            saveUndoState();
            const newItemsRaw = text.split(/[,\n]/).map(item => item.trim()).filter(Boolean);
            if (currentMode === 'team') {
                const existingNames = items.map(item => item.name);
                const allNames = [...existingNames, ...newItemsRaw];
                const shuffled = allNames.sort(() => 0.5 - Math.random());
                const newTeamItems = shuffled.map((name, index) => ({
                    name,
                    team: `Team ${(index % numberOfTeams) + 1}`,
                    teamNumber: (index % numberOfTeams) + 1,
                })).sort((a,b) => (a.teamNumber ?? 0) - (b.teamNumber ?? 0));
                setItems(newTeamItems);
            } else {
                setItems(prev => [...prev, ...newItemsRaw.map(name => ({ name }))]);
            }
            if(textInputRef.current) textInputRef.current.value = "";
            showResult(`Added ${newItemsRaw.length} item(s)`);
        }
    }, [currentMode, items, numberOfTeams, saveUndoState, showResult]);

    const spinWheel = useCallback(() => {
        if (isSpinning || items.length === 0) return;

        setIsSpinning(true);
        if (settings.soundEnabled) {
            soundEffects.current.playSpinStart();
            setTimeout(() => soundEffects.current.startSpinning(), 300);
        }

        const spins = 7 + Math.random() * 5;
        const randomAngle = Math.random() * 360;
        const totalRotation = spins * 360 + randomAngle;
        const newRotation = currentRotation + totalRotation;
        setCurrentRotation(newRotation);

        const segmentAngle = 360 / items.length;
        const normalizedAngle = ((360 - (newRotation % 360)) + 90) % 360;
        const winningIndex = Math.floor(normalizedAngle / segmentAngle);
        const winner = items[winningIndex % items.length];

        setTimeout(() => {
            if (settings.soundEnabled) {
                soundEffects.current.stopSpinning();
                soundEffects.current.playWinner();
            }
            const winnerText = winner.team ? `${winner.name} (${winner.team})` : winner.name;
            showResult(`🎉 ${winnerText}`);
            
            const timeString = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            setRecentWinners(prev => [{ name: winnerText, time: timeString }, ...prev.slice(0, 4)]);

            if (settings.removeWinner) {
                setTimeout(() => {
                    saveUndoState();
                    setItems(prev => prev.filter((_, i) => i !== (winningIndex % prev.length)));
                }, 1000);
            }

            setIsSpinning(false);
        }, 6000);
    }, [isSpinning, items, settings.removeWinner, settings.soundEnabled, currentRotation, saveUndoState, showResult]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.code === 'Space') {
                e.preventDefault();
                spinWheel();
            } else if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                setIsPresentationMode(p => !p);
            } else if (e.key === 'Escape') {
                if (isPresentationMode) setIsPresentationMode(false);
                else {
                    setIsSettingsOpen(false);
                    setIsShareOpen(false);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [spinWheel, isPresentationMode]);
    
    // Load from URL params on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.has('items')) {
            try {
                const sharedItems: Item[] = JSON.parse(atob(params.get('items')!));
                setItems(sharedItems);
                showResult('Wheel loaded from shared link!');
            } catch (e) { console.error('Failed to load shared items'); }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const clearItems = () => {
        saveUndoState();
        setItems([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (textInputRef.current) textInputRef.current.value = "";
        if (teamAddInputRef.current) teamAddInputRef.current.value = "";
        showResult('All items cleared');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            Papa.parse(file, {
                header: false,
                skipEmptyLines: true,
                complete: (results) => {
                    saveUndoState();
                    const newItems = (results.data as string[][]).map((row: any) => {
                        const name = row[0]?.trim();
                        if (!name) return null;
                        if (currentMode === 'team' && row[1]) {
                            return { name, team: row[1].trim(), teamNumber: 0 }; // teamNumber will be assigned
                        }
                        return { name };
                    }).filter(Boolean) as Item[];
                    
                    if (currentMode === 'team') {
                        setItems(newItems.map((item, index) => ({
                            ...item,
                            team: `Team ${(index % numberOfTeams) + 1}`,
                            teamNumber: (index % numberOfTeams) + 1
                        })));
                    } else {
                        setItems(newItems);
                    }
                    showResult('CSV loaded successfully!');
                }
            });
        }
    };
    
    const removeItem = (index: number) => {
        saveUndoState();
        const removedItem = items[index];
        setItems(prev => prev.filter((_, i) => i !== index));
        showResult(`Removed ${removedItem.name}`);
    };

    const undoLastAction = () => {
        if (undoHistory.length > 0) {
            const lastState = undoHistory[undoHistory.length - 1];
            setItems(lastState.items);
            setRecentWinners(lastState.winners);
            setUndoHistory(prev => prev.slice(0, -1));
            showResult('Action undone!');
        }
    };

    const generateShareLink = () => {
        if (typeof window !== 'undefined') {
            const encodedItems = btoa(JSON.stringify(items));
            const url = new URL(window.location.href);
            url.searchParams.set('items', encodedItems);
            setShareLink(url.toString());
            setIsShareOpen(true);
        }
    };

    const copyShareLink = () => {
        navigator.clipboard.writeText(shareLink);
        showResult('Link copied to clipboard!');
    };

    const changeMode = (mode: 'normal' | 'team') => {
        setCurrentMode(mode);
        if (mode === 'team') {
            const teamItems = items.map((item, index) => ({
                name: item.name,
                team: `Team ${(index % numberOfTeams) + 1}`,
                teamNumber: (index % numberOfTeams) + 1,
            }));
            setItems(teamItems.sort((a,b) => (a.teamNumber ?? 0) - (b.teamNumber ?? 0)));
            showResult('Switched to Team Mode');
        } else {
            setItems(items.map(({ name }) => ({ name })));
            showResult('Switched to Normal Mode');
        }
    };
    
    const teamCounts = React.useMemo(() => {
        if (currentMode !== 'team') return {};
        const counts: {[key: string]: number} = {};
        for(let i=1; i<=numberOfTeams; i++) counts[i] = 0;
        items.forEach(item => {
            if(item.teamNumber) counts[item.teamNumber]++;
        });
        return counts;
    }, [items, currentMode, numberOfTeams]);

    const isUnbalanced = React.useMemo(() => {
        if (currentMode !== 'team' || items.length === 0) return false;
        const counts = Object.values(teamCounts);
        return Math.max(...counts) - Math.min(...counts) > 1;
    }, [currentMode, items.length, teamCounts]);


    const shuffleTeams = () => {
        if (items.length === 0) return;
        saveUndoState();
        const shuffled = [...items].sort(() => 0.5 - Math.random());
        const newTeamItems = shuffled.map((item, index) => ({
            name: item.name,
            team: `Team ${(index % numberOfTeams) + 1}`,
            teamNumber: (index % numberOfTeams) + 1,
        })).sort((a,b) => (a.teamNumber ?? 0) - (b.teamNumber ?? 0));
        setItems(newTeamItems);
        showResult('Teams shuffled!');
    };
    
    const balanceTeams = () => {
        if (items.length === 0) return;
        saveUndoState();
        const allNames = items.map(item => item.name);
        const balancedItems = allNames.map((name, index) => ({
            name,
            team: `Team ${(index % numberOfTeams) + 1}`,
            teamNumber: (index % numberOfTeams) + 1,
        })).sort((a,b) => (a.teamNumber ?? 0) - (b.teamNumber ?? 0));
        setItems(balancedItems);
        showResult('Teams balanced!');
    };

    const addToTeam = () => {
        const name = teamAddInputRef.current?.value.trim();
        if (!name) return;
        saveUndoState();
        const minTeam = Object.keys(teamCounts).reduce((a, b) => teamCounts[a] <= teamCounts[b] ? a : b);
        const teamNum = parseInt(minTeam);
        setItems(prev => [...prev, { name, team: `Team ${teamNum}`, teamNumber: teamNum }].sort((a,b) => (a.teamNumber || 0) - (b.teamNumber || 0)));
        if(teamAddInputRef.current) teamAddInputRef.current.value = "";
        showResult(`Added "${name}" to Team ${teamNum}`);
    };

    return (
        <div className={cn("randomizer-page", theme, isPresentationMode && "presentation-mode")}>
             <style>{`
                .randomizer-page {
                    --bg-primary: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%);
                    --bg-secondary: rgba(255, 255, 255, 0.05);
                    --bg-hover: rgba(255, 255, 255, 0.08);
                    --border-color: rgba(255, 255, 255, 0.1);
                    --text-primary: white;
                    --text-secondary: rgba(255, 255, 255, 0.6);
                    --text-muted: rgba(255, 255, 255, 0.3);
                    --accent-blue: #4285F4;
                    --accent-gradient: linear-gradient(135deg, #4285F4 0%, #3367D6 100%);
                    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    transition: background 0.3s ease;
                }
                .randomizer-page.light {
                    --bg-primary: linear-gradient(180deg, #f5f5f7 0%, #e3e3e8 100%);
                    --bg-secondary: rgba(0, 0, 0, 0.03);
                    --bg-hover: rgba(0, 0, 0, 0.05);
                    --border-color: rgba(0, 0, 0, 0.1);
                    --text-primary: #1d1d1f;
                    --text-secondary: rgba(0, 0, 0, 0.6);
                    --text-muted: rgba(0, 0, 0, 0.3);
                    --accent-blue: #007AFF;
                    --accent-gradient: linear-gradient(135deg, #007AFF 0%, #0051D5 100%);
                }
                .randomizer-page .background-glow { position: fixed; width: 600px; height: 600px; border-radius: 50%; filter: blur(100px); opacity: 0.5; pointer-events: none; animation: float 20s ease-in-out infinite; }
                .randomizer-page .glow-1 { background: radial-gradient(circle, #4158D0 0%, transparent 70%); top: -200px; left: -200px; }
                .randomizer-page .glow-2 { background: radial-gradient(circle, #C850C0 0%, transparent 70%); bottom: -200px; right: -200px; animation-delay: -10s; }
                .randomizer-page.light .background-glow { opacity: 0.2; }
                @keyframes float { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -30px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } }
                .randomizer-page .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; position: relative; z-index: 1; }
                .randomizer-page .header { text-align: center; margin-bottom: 50px; position: relative; }
                .randomizer-page .title { font-size: 48px; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 8px; background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
                .randomizer-page .subtitle { color: var(--text-secondary); font-size: 18px; font-weight: 400; }
                .randomizer-page .header-btn { position: absolute; top: 0; width: 40px; height: 40px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; color: var(--text-primary); }
                .randomizer-page .settings-btn { right: 0; }
                .randomizer-page .hide-all-btn { right: 50px; }
                .randomizer-page .share-btn { right: 100px; }
                .randomizer-page .settings-btn:hover { transform: rotate(90deg); }
                .randomizer-page .hide-all-btn:hover, .randomizer-page .share-btn:hover { background: var(--bg-hover); transform: scale(1.05); }
                .randomizer-page.presentation-mode .container { max-width: 100%; padding: 20px; }
                .randomizer-page.presentation-mode .header, .randomizer-page.presentation-mode .header-btn, .randomizer-page.presentation-mode .control-panel, .randomizer-page.presentation-mode .action-button:not(.spin-button) { display: none; }
                .randomizer-page.presentation-mode .main-content { grid-template-columns: 1fr; }
                .randomizer-page.presentation-mode .wheel-section { min-height: calc(100vh - 40px); display: flex; flex-direction: column; align-items: center; justify-content: center; }
                .randomizer-page.presentation-mode .spin-button { padding: 18px 60px; font-size: 20px; }
                .randomizer-page .exit-presentation-btn { position: fixed; top: 20px; right: 20px; background: var(--bg-secondary); backdrop-filter: blur(20px); border: 1px solid var(--border-color); border-radius: 10px; color: var(--text-primary); cursor: pointer; z-index: 100; display: none; gap: 8px; align-items: center; padding: 10px 20px;}
                .randomizer-page.presentation-mode .exit-presentation-btn { display: flex; }
                .randomizer-page .main-content { display: grid; grid-template-columns: 350px 1fr; gap: 40px; align-items: start; }
                .randomizer-page .control-panel { background: var(--bg-secondary); backdrop-filter: blur(50px); border-radius: 24px; border: 1px solid var(--border-color); padding: 24px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2); }
                .randomizer-page .panel-section { margin-bottom: 24px; }
                .randomizer-page .section-title { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
                .randomizer-page .text-input { width: 100%; min-height: 100px; padding: 12px; background: var(--bg-hover); border: 1px solid var(--border-color); border-radius: 12px; color: var(--text-primary); font-size: 14px; resize: vertical; }
                .randomizer-page .button { width: 100%; padding: 10px 20px; background: var(--bg-hover); border: 1px solid var(--border-color); border-radius: 10px; color: var(--text-primary); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; margin-top: 8px; }
                .randomizer-page .button-primary { background: var(--accent-gradient); border: none; color: white; }
                .randomizer-page .items-list { max-height: 200px; overflow-y: auto; padding: 8px; background: var(--bg-hover); border-radius: 10px; }
                .randomizer-page .item-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: var(--bg-secondary); border-radius: 8px; margin: 4px 0; }
                .randomizer-page .remove-btn { padding: 4px 8px; background: rgba(255, 59, 48, 0.2); border: 1px solid rgba(255, 59, 48, 0.3); border-radius: 6px; color: #ff3b30; font-size: 11px; cursor: pointer; }
                .randomizer-page .recent-winners { max-height: 150px; overflow-y: auto; padding: 8px; background: var(--bg-hover); border-radius: 10px; }
                .randomizer-page .winner-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; margin: 4px 0; background: var(--bg-secondary); border-radius: 8px; border-left: 3px solid; }
                .randomizer-page .wheel-section { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 500px; }
                .randomizer-page .wheel-container { position: relative; transition: all 0.3s ease; }
                .randomizer-page .wheel-container.small { width: 300px; height: 300px; }
                .randomizer-page .wheel-container.medium { width: 400px; height: 400px; }
                .randomizer-page .wheel-container.large { width: 500px; height: 500px; }
                .randomizer-page .wheel-border { position: absolute; inset: -20px; background: linear-gradient(135deg, var(--border-color) 0%, var(--bg-secondary) 100%); border-radius: 50%; padding: 20px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.1); }
                .randomizer-page .wheel { width: 100%; height: 100%; border-radius: 50%; position: relative; overflow: hidden; transition: transform 6s cubic-bezier(0.23, 1, 0.32, 1); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), inset 0 0 80px rgba(0, 0, 0, 0.3); }
                .randomizer-page .pointer { position: absolute; top: -30px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 20px solid transparent; border-right: 20px solid transparent; border-top: 40px solid var(--text-primary); filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)); z-index: 10; }
                .randomizer-page .action-buttons { display: flex; gap: 12px; margin-top: 30px; justify-content: center; align-items: center; }
                .randomizer-page .spin-button { padding: 14px 48px; background: var(--accent-gradient); border: none; border-radius: 14px; color: white; font-size: 16px; font-weight: 600; cursor: pointer; }
                .randomizer-page .result-container { margin-top: 30px; padding: 20px; background: var(--bg-secondary); backdrop-filter: blur(50px); border-radius: 16px; border: 1px solid var(--border-color); text-align: center; min-height: 70px; display: flex; align-items: center; justify-content: center; }
                .randomizer-page .result-text { font-size: 24px; font-weight: 600; opacity: 0; transform: scale(0.8); transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
                .randomizer-page .result-text.show { opacity: 1; transform: scale(1); }
                .randomizer-page .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(10px); z-index: 1000; display: none; align-items: center; justify-content: center; }
                .randomizer-page .modal-overlay.active { display: flex; }
                .randomizer-page .modal { background: var(--bg-secondary); backdrop-filter: blur(50px); border: 1px solid var(--border-color); border-radius: 20px; padding: 30px; max-width: 400px; width: 90%; }
                .randomizer-page .modal-header { display: flex; justify-content: space-between; margin-bottom: 24px; }
                .randomizer-page .modal-title { font-size: 24px; font-weight: 600; }
                .randomizer-page .close-btn { background: var(--bg-hover); border: none; border-radius: 8px; cursor: pointer; padding: 5px; color: var(--text-primary); }
                .randomizer-page .setting-item { margin-bottom: 20px; }
                .randomizer-page .toggle-switch { position: relative; width: 50px; height: 28px; background: var(--border-color); border-radius: 14px; cursor: pointer; }
                .randomizer-page .toggle-switch.active { background: var(--accent-gradient); }
                .randomizer-page .toggle-slider { position: absolute; width: 24px; height: 24px; background: white; border-radius: 50%; top: 2px; left: 2px; transition: transform 0.3s; }
                .randomizer-page .toggle-switch.active .toggle-slider { transform: translateX(22px); }
                .randomizer-page .radio-group { display: flex; gap: 10px; }
                .randomizer-page .radio-option { flex: 1; padding: 10px; background: var(--bg-hover); border: 2px solid var(--border-color); border-radius: 10px; text-align: center; cursor: pointer; }
                .randomizer-page .radio-option.active { background: var(--accent-gradient); border-color: var(--accent-blue); color: white; }
                .randomizer-page .team-badge { font-size: 11px; padding: 2px 6px; color: white; border-radius: 4px; margin-right: 8px; font-weight: 600; }
                .randomizer-page .team-1 { background: linear-gradient(135deg, #FF6B6B, #FF5252); }
                .randomizer-page .team-2 { background: linear-gradient(135deg, #4ECDC4, #44A08D); }
                .randomizer-page .team-3 { background: linear-gradient(135deg, #45B7D1, #2196F3); }
                .randomizer-page .team-4 { background: linear-gradient(135deg, #96CEB4, #4CAF50); }
                .randomizer-page .team-5 { background: linear-gradient(135deg, #FECA57, #FF9800); }
                .mode-toggle { display: flex; background: var(--bg-hover); border-radius: 10px; padding: 4px; margin-bottom: 12px; }
                .mode-btn { flex: 1; padding: 8px; background: transparent; border: none; border-radius: 8px; color: var(--text-secondary); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
                .mode-btn.active { background: var(--accent-gradient); color: white; }
                .team-input { width: 100%; padding: 8px 12px; background: var(--bg-hover); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); font-size: 14px; }
                @media (max-width: 768px) {
                    .randomizer-page .main-content { grid-template-columns: 1fr; }
                    .randomizer-page .wheel-container.large { width: 350px; height: 350px; }
                }
             `}</style>
            <div className="background-glow glow-1"></div>
            <div className="background-glow glow-2"></div>
            
            {isPresentationMode && 
                <button className="exit-presentation-btn" onClick={() => setIsPresentationMode(false)}>
                    <X size={16} /> Exit Presentation
                </button>
            }

            <div className="container">
                <div className="header">
                    <h1 className="title">Decision Wheel Pro</h1>
                    <p className="subtitle">Let chance make the choice</p>
                    <button className="header-btn share-btn" onClick={generateShareLink} title="Share Wheel">
                        <Share2 size={20}/>
                    </button>
                    <button className="header-btn hide-all-btn" onClick={() => setIsPresentationMode(p => !p)} title="Presentation Mode (P)">
                        <Monitor size={20}/>
                    </button>
                    <button className="header-btn settings-btn" onClick={() => setIsSettingsOpen(true)}>
                       <Settings size={20}/>
                    </button>
                </div>

                <div className="main-content">
                    <div className="control-panel">
                        {/* Mode Section */}
                        <div className="panel-section">
                            <div className="section-title">Mode</div>
                            <div className="mode-toggle">
                                <button className={cn('mode-btn', currentMode === 'normal' && 'active')} onClick={() => changeMode('normal')}>Normal</button>
                                <button className={cn('mode-btn', currentMode === 'team' && 'active')} onClick={() => changeMode('team')}>Teams</button>
                            </div>
                            {currentMode === 'team' && (
                                <div style={{marginTop: '12px'}}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
                                        <label style={{fontSize: '13px', color: 'var(--text-secondary)'}}>Teams:</label>
                                        <select value={numberOfTeams} onChange={e => setNumberOfTeams(Number(e.target.value))} style={{flex: 1, padding: '6px', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)'}}>
                                            <option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
                                        </select>
                                    </div>
                                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                                        <Button className="button-primary" onClick={shuffleTeams}><Shuffle size={14}/> Shuffle</Button>
                                        <Button onClick={balanceTeams}><Scale size={14}/> Balance</Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* File Input */}
                        <div className="panel-section">
                            <div className="section-title">Import Data</div>
                            <input type="file" id="csvFile" accept=".csv" ref={fileInputRef} onChange={handleFileChange} style={{display: 'none'}}/>
                            <Button className="w-full justify-center gap-2" onClick={() => fileInputRef.current?.click()}><Upload size={14}/> Choose CSV</Button>
                        </div>
                        
                        {/* Items Input */}
                        <div className="panel-section">
                            <div className="section-title">Add Items</div>
                            {currentMode === 'normal' ? (
                                <>
                                    <textarea ref={textInputRef} className="text-input" placeholder="Enter items (one per line)..."></textarea>
                                    <Button className="button-primary" onClick={addTextItems}>Add to Wheel</Button>
                                </>
                            ) : (
                                <>
                                    <input type="text" ref={teamAddInputRef} className="team-input" placeholder="Enter name to add to teams" onKeyDown={(e) => e.key === 'Enter' && addToTeam()} />
                                    <Button className="button-primary" onClick={addToTeam}>Add to Teams</Button>
                                </>
                            )}
                        </div>
                        
                        {/* Current Items */}
                        <div className="panel-section">
                            <div className="section-title"><span>Current Items</span><span>({items.length})</span></div>
                            <div className="items-list">
                                {items.length === 0 ? <div style={{textAlign: 'center', color: 'var(--text-muted)'}}>No items</div> :
                                    items.map((item, index) => (
                                        <div key={index} className="item-row">
                                            <span>
                                                {item.team && <span className={cn("team-badge", `team-${item.teamNumber}`)}>{item.team}</span>}
                                                {item.name}
                                            </span>
                                            <button className="remove-btn" onClick={() => removeItem(index)}>X</button>
                                        </div>
                                    ))
                                }
                                 {currentMode === 'team' && items.length > 0 && (
                                    <div style={{padding: '10px', marginTop: '10px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '12px', textAlign: 'center'}}>
                                        <div>Team Distribution {isUnbalanced && <span style={{color: '#FECA57'}}>⚠️ Unbalanced</span>}</div>
                                        {Object.entries(teamCounts).map(([team, count])=> <span key={team} style={{margin: '2px'}}><span className={cn('team-badge', `team-${team}`)}>Team {team}</span> {count}</span>)}
                                    </div>
                                )}
                            </div>
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px'}}>
                                <Button onClick={clearItems}><Trash2 size={14}/> Clear</Button>
                                <Button onClick={undoLastAction}><Undo size={14}/> Undo</Button>
                            </div>
                        </div>

                        {/* Recent Winners */}
                        <div className="panel-section">
                            <div className="section-title">Recent Winners</div>
                            <div className="recent-winners">
                               {recentWinners.length === 0 ? <div style={{textAlign: 'center', color: 'var(--text-muted)'}}>No spins yet</div> :
                                recentWinners.map((winner, index) => (
                                    <div key={index} className="winner-item" style={{borderLeftColor: teamColors[index % teamColors.length]}}>
                                        <span><span style={{marginRight: '8px'}}>{index+1}.</span>{winner.name}</span>
                                        <span style={{fontSize: '11px', color: 'var(--text-secondary)'}}>{winner.time}</span>
                                    </div>
                                ))}
                            </div>
                            <Button style={{marginTop: '8px'}} onClick={() => setRecentWinners([])}>Clear History</Button>
                        </div>
                    </div>

                    <div className="wheel-section">
                        <div className={cn("wheel-container", wheelSize)}>
                            <div className="wheel-border">
                                <div ref={wheelRef} className="wheel" style={{ transform: `rotate(${currentRotation}deg)` }}>
                                    {items.map((item, index) => {
                                        const segmentAngle = 360 / items.length;
                                        const colorSet = currentMode === 'team' && item.teamNumber ? teamColorSets[item.teamNumber - 1] || teamColors : teamColors;
                                        const color = colorSet[index % colorSet.length];
                                        
                                        return (
                                            <div key={index} className="wheel-segment" style={{ transform: `rotate(${index * segmentAngle}deg)`, clipPath: 'polygon(50% 50%, 0% 0%, 100% 0%)' }}>
                                                 <div style={{ position: 'absolute', width: '200%', height: '200%', left: '-50%', top: '-50%', background: `conic-gradient(from -${segmentAngle/2}deg, ${color} 0deg, ${color} ${segmentAngle}deg, transparent ${segmentAngle}deg)`}}>
                                                     <div style={{position: 'absolute', left: '50%', top: '25%', transform: `translate(-50%, -50%) rotate(${90}deg)`, textAlign: 'center', color: 'white', fontWeight: 600, width: '50%' }}>{item.name}</div>
                                                 </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                            <div className="pointer"></div>
                        </div>
                        <div className="action-buttons">
                            <button className="spin-button" onClick={spinWheel} disabled={isSpinning || items.length === 0}>
                                Spin!
                            </button>
                        </div>
                        <div className="result-container">
                            <div className="result-text" id="resultText">{resultText}</div>
                        </div>
                    </div>
                </div>

                {isSettingsOpen && (
                    <div className="modal-overlay active">
                        <div className="modal">
                            <div className="modal-header">
                                <h2 className="modal-title">Settings</h2>
                                <button className="close-btn" onClick={() => setIsSettingsOpen(false)}><X size={20}/></button>
                            </div>
                            <div className="setting-item">
                                <label className="setting-label">Remove winner after spin</label>
                                <div className={cn("toggle-switch", settings.removeWinner && 'active')} onClick={() => setSettings(s => ({...s, removeWinner: !s.removeWinner}))}><div className="toggle-slider"></div></div>
                            </div>
                            <div className="setting-item">
                                <label className="setting-label">Sound Effects</label>
                                <div className={cn("toggle-switch", settings.soundEnabled && 'active')} onClick={() => setSettings(s => ({...s, soundEnabled: !s.soundEnabled}))}><div className="toggle-slider"></div></div>
                            </div>
                             <div className="setting-item">
                                <label className="setting-label">Theme</label>
                                <div className={cn("toggle-switch", theme === 'light' && 'active')} onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}><div className="toggle-slider"></div></div>
                            </div>
                            <div className="setting-item">
                                <label className="setting-label">Wheel Size</label>
                                <div className="radio-group">
                                    <div className={cn('radio-option', wheelSize==='small' && 'active')} onClick={() => setWheelSize('small')}>Small</div>
                                    <div className={cn('radio-option', wheelSize==='medium' && 'active')} onClick={() => setWheelSize('medium')}>Medium</div>
                                    <div className={cn('radio-option', wheelSize==='large' && 'active')} onClick={() => setWheelSize('large')}>Large</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                 {isShareOpen && (
                    <div className="modal-overlay active">
                        <div className="modal">
                            <div className="modal-header">
                                <h2 className="modal-title">Share Wheel</h2>
                                <button className="close-btn" onClick={() => setIsShareOpen(false)}><X size={20}/></button>
                            </div>
                             <p style={{color: 'var(--text-secondary)', marginBottom: '15px'}}>Copy this link to share your wheel:</p>
                             <div style={{display: 'flex', gap: '10px'}}>
                                 <input type="text" readOnly value={shareLink} style={{flex: 1, padding: '10px', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)'}}/>
                                 <Button onClick={copyShareLink}>Copy</Button>
                             </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};


export default function RandomizerPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isSignInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  return (
    <>
      <Header 
        user={user}
        onSignInClick={() => setSignInOpen(true)}
      />
      <main>
        <RandomizerWheel />
      </main>
      <SignInDialog
        isOpen={isSignInOpen}
        onOpenChange={setSignInOpen}
      />
    </>
  );
}

    