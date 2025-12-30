"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send } from "lucide-react";
import { ChatService, ChatMessage } from "@/lib/services/chat-service";
import { useAuth } from "@/components/providers/AuthProvider";

export default function MessagesPage() {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [roomId, setRoomId] = useState("general");
    const scrollRef = useRef<HTMLDivElement>(null);

    // Subscribe to messages
    useEffect(() => {
        const unsubscribe = ChatService.subscribeToMessages(roomId, (msgs) => {
            setMessages(msgs);
            // Auto scroll to bottom
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 100);
        });

        return () => unsubscribe();
    }, [roomId]);

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
            alert("Lỗi gửi tin nhắn");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSend();
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-6">
            {/* Sidebar List */}
            <div className="w-64 flex flex-col gap-4">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-primary" />
                            Kênh Chat
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
                        <Button
                            variant={roomId === "general" ? "secondary" : "ghost"}
                            className="w-full justify-start"
                            onClick={() => setRoomId("general")}
                        >
                            # Chung (Toàn phòng khám)
                        </Button>
                        <Button
                            variant={roomId === "doctors" ? "secondary" : "ghost"}
                            className="w-full justify-start text-muted-foreground"
                            disabled
                        // onClick={() => setRoomId("doctors")}
                        >
                            # Bác sĩ (Sắp ra mắt)
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Chat Window */}
            <div className="flex-1">
                <Card className="h-full flex flex-col">
                    {/* Messages Area */}
                    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                        <div className="space-y-4">
                            {messages.map((msg) => {
                                const isMe = msg.senderId === user?.uid;
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                        <div className={`max-w-[70%] rounded-lg p-3 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                                            }`}>
                                            {!isMe && <p className="text-xs font-bold mb-1 text-primary">{msg.senderName}</p>}
                                            <p className="text-sm">{msg.text}</p>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground mt-1">
                                            {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                );
                            })}
                            {messages.length === 0 && (
                                <p className="text-center text-muted-foreground text-sm italic py-10">
                                    Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!
                                </p>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Input Area */}
                    <div className="p-4 border-t flex gap-2">
                        <Input
                            placeholder="Nhập tin nhắn..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <Button size="icon" onClick={handleSend}>
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
