import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, orderBy, onSnapshot, limit, Timestamp } from "firebase/firestore";

export interface ChatMessage {
    id: string;
    text: string;
    senderId: string;
    senderName: string; // denormalized for simplicity
    createdAt: number;
    roomId: string; // "general" or specific
}

export const ChatService = {
    // Send a message
    sendMessage: async (text: string, senderId: string, senderName: string, roomId: string = "general") => {
        try {
            await addDoc(collection(db, "messages"), {
                text,
                senderId,
                senderName,
                roomId,
                createdAt: Date.now()
            });
        } catch (error) {
            console.error("Error sending message:", error);
            throw error;
        }
    },

    // Subscribe to messages (Real-time)
    subscribeToMessages: (roomId: string, callback: (messages: ChatMessage[]) => void) => {
        const q = query(
            collection(db, "messages"),
            where("roomId", "==", roomId),
            // orderBy("createdAt", "asc"), // Removed to avoid needing a composite index
            limit(100)
        );

        return onSnapshot(q, (snapshot) => {
            const messages: ChatMessage[] = [];
            snapshot.forEach(doc => {
                messages.push({ id: doc.id, ...doc.data() } as ChatMessage);
            });
            // Client-side sort
            messages.sort((a, b) => a.createdAt - b.createdAt);
            callback(messages);
        }, (error) => {
            console.error("Chat listener error:", error);
        });
    }
};
