
"use client";

import { Header } from "@/components/header";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Button } from "@/components/ui/button";
import { Settings, X, Share2, Monitor, Shuffle, Scale, Undo, Trash2, Upload, Volume2, VolumeX, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import Papa from "papaparse";
import { Confetti } from "@/components/confetti";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Class, UserData } from "@/lib/types";

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
        const spinDuration = 7700; // Adjusted to match animation
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

type Item = { name: string; team?: string; teamNumber?: number; color: string; };
type Winner = { name: string; time: string };
type UndoState = { items: Item[], winners: Winner[] };

const RandomizerWheel = () => {
    const searchParams = useSearchParams();
    const classId = searchParams.get('classId');

    const [user, setUser] = useState<User | null>(null);
    const [items, setItems] = useState<Item[]>([]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [currentRotation, setCurrentRotation] = useState(0);
    const [recentWinners, setRecentWinners] = useState<Winner[]>([]);
    const [undoHistory, setUndoHistory] = useState<UndoState[]>([]);
    const [settings, setSettings] = useState({ removeWinner: false, soundEnabled: true });
    const [currentMode, setCurrentMode] = useState<'normal' | 'team'>('normal');
    const [numberOfTeams, setNumberOfTeams] = useState(2);
    const [isPresentationMode, setIsPresentationMode] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [shareLink, setShareLink] = useState("");
    const [winner, setWinner] = useState<{item: Item, text: string} | null>(null);

    const wheelRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textInputRef = useRef<HTMLTextAreaElement>(null);
    const teamAddInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const soundEffects = useRef(new SoundEffects());
    
    // Store items in Firestore for persistence
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    // Load from class or from Firestore for generic wheel
    useEffect(() => {
        if (classId && user) {
            // Class mode: Load learners from class
            const fetchClassLearners = async () => {
                const classRef = doc(db, "classes", classId);
                const classSnap = await getDoc(classRef);
                if (classSnap.exists()) {
                    const classData = classSnap.data() as Class;
                    if (classData.trainerUid === user.uid) {
                        const learnerUids = classData.learnerUids;
                        if(learnerUids.length > 0) {
                            const learnerPromises = learnerUids.map(uid => getDoc(doc(db, "users", uid)));
                            const learnerDocs = await Promise.all(learnerPromises);
                            const learnerItems = learnerDocs
                                .map(docSnap => docSnap.data() as UserData)
                                .filter(learner => learner && learner.displayName)
                                .map(learner => ({
                                    name: learner.displayName!,
                                    color: teamColors[Math.floor(Math.random() * teamColors.length)]
                                }));
                            setItems(learnerItems);
                        } else {
                            setItems([]);
                        }
                    }
                }
            };
            fetchClassLearners();
        } else if (user) {
            // Generic mode: Load from user's saved list
            const docRef = doc(db, "randomizer_lists", user.uid);
            const unsubscribe = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if(data.items) setItems(data.items);
                    if(data.recentWinners) setRecentWinners(data.recentWinners);
                    if(data.settings) setSettings(s => ({...s, ...data.settings}));
                } else {
                    setItems([]);
                    setRecentWinners([]);
                }
            }, (error) => console.error("Firestore snapshot error:", error));
            return () => unsubscribe();
        } else {
            // Not signed in
            setItems([]);
            setRecentWinners([]);
        }
    }, [user, classId]);

    const saveStateToFirestore = useCallback(async (newState: { items?: Item[], recentWinners?: Winner[], settings?: Partial<typeof settings> }) => {
        if (user && !classId) { // Only save to firestore for generic wheels
            try {
                const docRef = doc(db, "randomizer_lists", user.uid);
                const currentState = (await getDoc(docRef)).data() || {};
                await setDoc(docRef, { ...currentState, ...newState }, { merge: true });
            } catch(e) {
                console.error("Could not save state to firestore", e);
            }
        }
    }, [user, classId]);
    
    const teamColorSets = [
        ['#FF6B6B', '#FF5252', '#FF7979', '#FF4444'], // Team 1 - Reds
        ['#4ECDC4', '#44A08D', '#5ED4CB', '#3A9B89'], // Team 2 - Teals
        ['#45B7D1', '#2196F3', '#56C4DD', '#1E88E5'], // Team 3 - Blues
        ['#96CEB4', '#4CAF50', '#A4D6BC', '#45A049'], // Team 4 - Greens
        ['#FECA57', '#FF9800', '#FFD166', '#FB8C00']  // Team 5 - Yellows/Oranges
    ];
    const teamColors = teamColorSets.flat();

    const drawWheel = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
    
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
    
        const [width, height] = [rect.width, rect.height];
        const [cx, cy] = [width / 2, height / 2];
        const radius = Math.min(width, height) / 2 - 10; // padding
    
        if (items.length === 0) {
            ctx.clearRect(0, 0, width, height);
            ctx.textAlign = 'center';
            ctx.fillStyle = 'var(--text-secondary)';
            ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif';
            ctx.fillText(classId ? "No learners in this class." : "Add items to get started.", width/2, height/2);
            return;
        }
    
        const segmentAngle = 2 * Math.PI / items.length;
    
        items.forEach((item, i) => {
            const color = item.color;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, radius, i * segmentAngle, (i + 1) * segmentAngle);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
        });
    
        items.forEach((item, i) => {
            const angle = i * segmentAngle + segmentAngle / 2;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 3;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;

            const text = item.name;
            const textRadius = radius * 0.6;
            
            const maxTextWidth = radius * 0.5;
            const words = text.split(' ');
            let line = '';
            let y = 5;

            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                if (testWidth > maxTextWidth && n > 0) {
                    ctx.fillText(line, textRadius, y);
                    line = words[n] + ' ';
                    y += 16;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, textRadius, y);
            ctx.restore();
        });
    }, [items, classId]);

    useEffect(() => {
        drawWheel();
    }, [drawWheel, items]);

    const saveUndoState = useCallback(() => {
        setUndoHistory(prev => {
            const newState = { items: JSON.parse(JSON.stringify(items)), winners: [...recentWinners] };
            const newHistory = [...prev, newState];
            return newHistory.length > 10 ? newHistory.slice(1) : newHistory;
        });
    }, [items, recentWinners]);

    const updateItems = (newItems: Item[]) => {
        setItems(newItems);
        if(!classId) saveStateToFirestore({ items: newItems });
    };

    const addTextItems = useCallback(() => {
        const text = textInputRef.current?.value.trim();
        if (text) {
            saveUndoState();
            const newItemsRaw = text.split(/[,\n]/).map(item => item.trim()).filter(Boolean);
            if (currentMode === 'team') {
                const existingNames = items.map(item => item.name);
                const allNames = [...existingNames, ...newItemsRaw];
                const shuffled = allNames.sort(() => 0.5 - Math.random());
                const newTeamItems = shuffled.map((name, index) => {
                    const teamNumber = (index % numberOfTeams) + 1;
                    return {
                        name,
                        team: `Team ${teamNumber}`,
                        teamNumber: teamNumber,
                        color: teamColorSets[teamNumber - 1][Math.floor(Math.random() * teamColorSets[teamNumber - 1].length)],
                    };
                }).sort((a,b) => (a.teamNumber ?? 0) - (b.teamNumber ?? 0));
                updateItems(newTeamItems);
            } else {
                 const newItems = newItemsRaw.map(name => ({ name, color: teamColors[Math.floor(Math.random() * teamColors.length)] }));
                updateItems([...items, ...newItems]);
            }
            if(textInputRef.current) textInputRef.current.value = "";
        }
    }, [currentMode, items, numberOfTeams, saveUndoState, teamColors, teamColorSets]);

    const closeWinnerOverlay = () => {
        if (!winner) return;

        if (settings.removeWinner) {
            saveUndoState();
            const updatedItems = items.filter(item => item.name !== winner.item.name);
            updateItems(updatedItems);
        }
        setWinner(null);
    };

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
        const finalAngle = newRotation % 360;
        const winningIndex = Math.floor((360 - finalAngle) / segmentAngle);
        const winnerItem = items[winningIndex % items.length];

        setTimeout(() => {
            if (settings.soundEnabled) {
                soundEffects.current.stopSpinning();
                soundEffects.current.playWinner();
            }
            const winnerText = winnerItem.team ? `${winnerItem.name} (${winnerItem.team})` : winnerItem.name;
            setWinner({ item: winnerItem, text: winnerText });
            
            const timeString = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            const newWinners = [{ name: winnerText, time: timeString }, ...recentWinners.slice(0, 4)];
            setRecentWinners(newWinners);
            if(!classId) saveStateToFirestore({ recentWinners: newWinners });
            
            setIsSpinning(false);
        }, 8000);
    }, [isSpinning, items, settings.soundEnabled, currentRotation, recentWinners, saveUndoState, classId]);

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
                if(winner) closeWinnerOverlay();
                else if (isPresentationMode) setIsPresentationMode(false);
                else {
                    setIsShareOpen(false);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [spinWheel, isPresentationMode, winner]);
    
    // Load from URL params on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.has('items') && !classId) {
            try {
                const sharedItems: Item[] = JSON.parse(atob(params.get('items')!));
                setItems(sharedItems);
            } catch (e) { console.error('Failed to load shared items'); }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [classId]);

    const clearItems = () => {
        saveUndoState();
        updateItems([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (textInputRef.current) textInputRef.current.value = "";
        if (teamAddInputRef.current) teamAddInputRef.current.value = "";
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
                         const color = teamColors[Math.floor(Math.random() * teamColors.length)];
                        if (currentMode === 'team' && row[1]) {
                            return { name, team: row[1].trim(), teamNumber: 0, color }; // teamNumber will be assigned
                        }
                        return { name, color };
                    }).filter(Boolean) as Item[];
                    
                    if (currentMode === 'team') {
                        updateItems(newItems.map((item, index) => ({
                            ...item,
                            team: `Team ${(index % numberOfTeams) + 1}`,
                            teamNumber: (index % numberOfTeams) + 1
                        })));
                    } else {
                        updateItems(newItems);
                    }
                }
            });
        }
    };
    
    const removeItem = (index: number) => {
        saveUndoState();
        const removedItem = items[index];
        const newItems = items.filter((_, i) => i !== index)
        updateItems(newItems);
    };

    const undoLastAction = () => {
        if (undoHistory.length > 0) {
            const lastState = undoHistory[undoHistory.length - 1];
            updateItems(lastState.items);
            setRecentWinners(lastState.winners);
            setUndoHistory(prev => prev.slice(0, -1));
        }
    };

    const generateShareLink = () => {
        if (typeof window !== 'undefined') {
            const encodedItems = btoa(JSON.stringify(items));
            const url = new URL(window.location.href);
            url.searchParams.set('items', encodedItems);
            if (classId) url.searchParams.delete('classId');
            setShareLink(url.toString());
            setIsShareOpen(true);
        }
    };

    const copyShareLink = () => {
        navigator.clipboard.writeText(shareLink);
    };

    const changeMode = (mode: 'normal' | 'team') => {
        setCurrentMode(mode);
        if (mode === 'team') {
            const teamItems = items.map((item, index) => ({
                ...item,
                team: `Team ${(index % numberOfTeams) + 1}`,
                teamNumber: (index % numberOfTeams) + 1,
            }));
            const sortedTeamItems = teamItems.sort((a,b) => (a.teamNumber ?? 0) - (b.teamNumber ?? 0));
            updateItems(sortedTeamItems);
        } else {
            const newItems = items.map(({ name, color }) => ({ name, color }));
            updateItems(newItems);
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
            color: item.color,
        })).sort((a,b) => (a.teamNumber ?? 0) - (b.teamNumber ?? 0));
        updateItems(newTeamItems);
    };
    
    const balanceTeams = () => {
        if (items.length === 0) return;
        saveUndoState();
        const allItems = [...items];
        const balancedItems = allItems.map((item, index) => ({
            name: item.name,
            team: `Team ${(index % numberOfTeams) + 1}`,
            teamNumber: (index % numberOfTeams) + 1,
            color: item.color,
        })).sort((a,b) => (a.teamNumber ?? 0) - (b.teamNumber ?? 0));
        updateItems(balancedItems);
    };

    const addToTeam = () => {
        const name = teamAddInputRef.current?.value.trim();
        if (!name) return;
        saveUndoState();
        const minTeam = Object.keys(teamCounts).reduce((a, b) => teamCounts[a] <= teamCounts[b] ? a : b);
        const teamNum = parseInt(minTeam);
        const color = teamColorSets[teamNum - 1][Math.floor(Math.random() * teamColorSets[teamNum - 1].length)];
        const newItems = [...items, { name, team: `Team ${teamNum}`, teamNumber: teamNum, color }].sort((a,b) => (a.teamNumber || 0) - (b.teamNumber || 0));
        updateItems(newItems);
        if(teamAddInputRef.current) teamAddInputRef.current.value = "";
    };

    const updateRecentWinners = (newWinners: Winner[]) => {
        setRecentWinners(newWinners);
        if (!classId) saveStateToFirestore({ recentWinners: newWinners });
    };
    
    const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
        const newSettings = {...settings, [key]: value};
        setSettings(newSettings);
        if(!classId) saveStateToFirestore({settings: newSettings});
    }

    const isClassMode = !!classId;

    return (
        <div className={cn("randomizer-page", isPresentationMode && "presentation-mode")}>
             <style>{`
                .randomizer-page {
                    --bg-primary: hsl(var(--background));
                    --bg-secondary: hsl(var(--card));
                    --bg-hover: hsl(var(--muted));
                    --border-color: hsl(var(--border));
                    --text-primary: hsl(var(--foreground));
                    --text-secondary: hsl(var(--muted-foreground));
                    --text-muted: hsl(var(--muted-foreground) / 0.5);
                    --accent-blue: hsl(var(--primary));
                    --accent-gradient: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%);
                    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    transition: background 0.3s ease;
                }
                .randomizer-page .background-glow { position: fixed; width: 600px; height: 600px; border-radius: 50%; filter: blur(100px); opacity: 0.15; pointer-events: none; animation: float 20s ease-in-out infinite; }
                .randomizer-page .glow-1 { background: radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%); top: -200px; left: -200px; }
                .randomizer-page .glow-2 { background: radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%); bottom: -200px; right: -200px; animation-delay: -10s; }
                @keyframes float { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -30px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } }
                .randomizer-page .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; position: relative; z-index: 1; }
                .randomizer-page .header { text-align: center; margin-bottom: 50px; position: relative; }
                .randomizer-page .title { font-size: 48px; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 8px; background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
                .randomizer-page .subtitle { color: var(--text-secondary); font-size: 18px; font-weight: 400; }
                .randomizer-page .header-btn { position: absolute; top: 0; width: 40px; height: 40px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; color: var(--text-primary); }
                .randomizer-page .hide-all-btn { right: 50px; }
                .randomizer-page .share-btn { right: 0; }
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
                .randomizer-page .wheel-container { position: relative; width: 400px; height: 400px; transition: all 0.3s ease; }
                .randomizer-page .wheel-border { position: absolute; inset: -20px; background: linear-gradient(135deg, var(--border-color) 0%, var(--bg-secondary) 100%); border-radius: 50%; padding: 20px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.1); }
                .randomizer-page .wheel { width: 100%; height: 100%; border-radius: 50%; position: relative; overflow: hidden; transition: transform 8s cubic-bezier(0.23, 1, 0.32, 1); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), inset 0 0 80px rgba(0, 0, 0, 0.3); }
                .randomizer-page .wheel canvas { width: 100%; height: 100%; }
                .randomizer-page .pointer { position: absolute; top: -30px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 20px solid transparent; border-right: 20px solid transparent; border-top: 40px solid var(--text-primary); filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)); z-index: 10; }
                .randomizer-page .action-buttons { display: flex; gap: 12px; margin-top: 30px; justify-content: center; align-items: center; }
                .randomizer-page .spin-button { padding: 14px 48px; background: var(--accent-gradient); border: none; border-radius: 14px; color: white; font-size: 16px; font-weight: 600; cursor: pointer; }
                .randomizer-page .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(10px); z-index: 1000; display: none; align-items: center; justify-content: center; }
                .randomizer-page .modal-overlay.active { display: flex; }
                .randomizer-page .modal { background: var(--bg-secondary); backdrop-filter: blur(50px); border: 1px solid var(--border-color); border-radius: 20px; padding: 30px; max-width: 400px; width: 90%; }
                .randomizer-page .modal-header { display: flex; justify-content: space-between; margin-bottom: 24px; }
                .randomizer-page .modal-title { font-size: 24px; font-weight: 600; }
                .randomizer-page .close-btn { background: var(--bg-hover); border: none; border-radius: 8px; cursor: pointer; padding: 5px; color: var(--text-primary); }
                .randomizer-page .setting-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 4px; border-bottom: 1px solid var(--border-color); }
                .randomizer-page .setting-item:last-of-type { border-bottom: none; }
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
                .winner-overlay {
                    position: fixed;
                    inset: 0;
                    background-color: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(10px);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    animation: fadeIn 0.5s ease-in-out;
                }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .winner-overlay-content {
                    text-align: center;
                    animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                 @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .winner-title {
                    font-size: 2rem;
                    color: var(--text-secondary);
                }
                .winner-name {
                    font-size: clamp(2rem, 10vw, 6rem);
                    font-weight: 700;
                    line-height: 1;
                    margin: 1rem 0;
                    background: linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    padding: 1rem;
                }
                
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
            {winner && (
                <div className="winner-overlay" onClick={closeWinnerOverlay}>
                    <Confetti onAnimationComplete={() => {}} />
                    <div className="winner-overlay-content">
                        <div className="winner-title">The winner is...</div>
                        <div className="winner-name">{winner.text}</div>
                        <Button onClick={closeWinnerOverlay}>Close</Button>
                    </div>
                </div>
            )}


            <div className="container">
                <div className="header">
                    <h1 className="title">{isClassMode ? "Class Randomizer" : "Decision Wheel Pro"}</h1>
                    <p className="subtitle">{isClassMode ? "Spin the wheel to select a learner." : "Let chance make the choice"}</p>
                    <button className="header-btn share-btn" onClick={generateShareLink} title="Share Wheel (S)">
                        <Share2 size={20}/>
                    </button>
                    <button className="header-btn hide-all-btn" onClick={() => setIsPresentationMode(p => !p)} title="Presentation Mode (P)">
                        <Monitor size={20}/>
                    </button>
                </div>

                <div className="main-content">
                    <div className="control-panel">
                        {/* Mode Section */}
                        <div className={cn("panel-section", isClassMode && "hidden")}>
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
                        <div className={cn("panel-section", isClassMode && "hidden")}>
                            <div className="section-title">Import Data</div>
                            <input type="file" id="csvFile" accept=".csv" ref={fileInputRef} onChange={handleFileChange} style={{display: 'none'}}/>
                            <Button className="w-full justify-center gap-2" onClick={() => fileInputRef.current?.click()}><Upload size={14}/> Choose CSV</Button>
                        </div>
                        
                        {/* Items Input */}
                        <div className={cn("panel-section", isClassMode && "hidden")}>
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
                            <div className="section-title"><span>{isClassMode ? "Learners" : "Current Items"}</span><span>({items.length})</span></div>
                            <div className="items-list">
                                {items.length === 0 ? <div style={{textAlign: 'center', color: 'var(--text-muted)'}}>{isClassMode ? "No learners in this class." : "No items on the wheel."}</div> :
                                    items.map((item, index) => (
                                        <div key={index} className="item-row">
                                            <span>
                                                {item.team && <span className={cn("team-badge", `team-${item.teamNumber}`)}>{item.team}</span>}
                                                {item.name}
                                            </span>
                                            {!isClassMode && <button className="remove-btn" onClick={() => removeItem(index)}>X</button>}
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
                             {!isClassMode && <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px'}}>
                                <Button onClick={clearItems}><Trash2 size={14}/> Clear</Button>
                                <Button onClick={undoLastAction}><Undo size={14}/> Undo</Button>
                            </div>}
                        </div>

                         {/* Settings Section */}
                         <div className="panel-section">
                            <div className="section-title">Settings</div>
                            <div className="setting-item">
                                <Label htmlFor="removeWinnerToggle">Remove winner after spin</Label>
                                <Switch id="removeWinnerToggle" checked={settings.removeWinner} onCheckedChange={(checked) => handleSettingChange('removeWinner', checked)} />
                            </div>
                             <div className="setting-item">
                                <Label htmlFor="soundToggle">Sound Effects</Label>
                                <Switch id="soundToggle" checked={settings.soundEnabled} onCheckedChange={(checked) => handleSettingChange('soundEnabled', checked)} />
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
                            <Button style={{marginTop: '8px'}} onClick={() => updateRecentWinners([])}>Clear History</Button>
                        </div>
                    </div>

                    <div className="wheel-section">
                        <div className={cn("wheel-container")}>
                            <div className="wheel-border">
                                <div ref={wheelRef} className="wheel" style={{ transform: `rotate(${currentRotation}deg)` }}>
                                    <canvas ref={canvasRef} />
                                </div>
                            </div>
                            <div className="pointer"></div>
                        </div>
                        <div className="action-buttons">
                            <button className="spin-button" onClick={spinWheel} disabled={isSpinning || items.length === 0}>
                                Spin!
                            </button>
                        </div>
                    </div>
                </div>

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
export const dynamic = 'force-dynamic';
export const revalidate = 0;

    