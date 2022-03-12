export interface Session {
    uid: string,
    date: Date,
    data: number[]
    id?: number
    numSamples?: number
}

export interface RawDataPacket {
    sessionID: number,
    idx: number,
    data: number[]
}