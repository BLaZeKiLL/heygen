export interface HeyGenStatusListener {
    listen(id: number, 
        callback: (id: number, message: string) => void, 
        onerror?: (error: any) => void, 
        options?: any
    ): void;
    stop(id: number): void;
    dispose(): void;
}