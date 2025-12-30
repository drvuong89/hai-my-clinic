"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageSquare, X, Send, Minimize2, Maximize2 } from "lucide-react";
import { ChatService, ChatMessage } from "@/lib/services/chat-service";
import { useAuth } from "@/components/providers/AuthProvider";

export function ChatWidget() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    // Only load messages when widget is open initially? 
    // Or load always to count unread? For now load always.
    useEffect(() => {
        if (!user) return;

        const unsubscribe = ChatService.subscribeToMessages("general", (msgs) => {
            setMessages(msgs);
            if (!isOpen) {
                // Simple logic: if new messages arrive while closed, increment unread (basic impl)
                // Real impl needs lastRead timestamp. Skip for MVP.
            }
            // Auto scroll
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 100);
        });

        return () => unsubscribe();
    }, [user, isOpen]);

    const handleSend = async () => {
        if (!newMessage.trim() || !user) return;
        try {
            await ChatService.sendMessage(
                newMessage,
                user.uid,
                user.displayName || user.email?.split('@')[0] || "Staff"
            );
            setNewMessage("");
        } catch (error) {
            console.error(error);
        }
    };

    if (!user) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
            {isOpen ? (
                <Card className="w-80 h-96 shadow-xl flex flex-col animate-in slide-in-from-bottom-5">
                    <CardHeader className="p-3 border-b flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Chat Nội bộ
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
                        <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50" ref={scrollRef}>
                            {messages.map((msg) => {
                                const isMe = msg.senderId === user.uid;
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                        <div className={`max-w-[85%] rounded px-2 py-1 text-xs ${isMe ? "bg-primary text-primary-foreground" : "bg-white border shadow-sm"
                                            }`}>
                                            {!isMe && <span className="font-bold text-primary mr-1">{msg.senderName}:</span>}
                                            {msg.text}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-2 border-t bg-white flex gap-2">
                            <Input
                                className="h-8 text-xs"
                                placeholder="Nhập tin nhắn..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            />
                            <Button size="icon" className="h-8 w-8" onClick={handleSend}>
                                <Send className="w-3 h-3" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="rounded-full h-12 w-12 shadow-lg bg-primary hover:bg-primary/90"
                >
                    <MessageSquare className="w-6 h-6" />
                </Button>
            )}
        </div>
    );
}
