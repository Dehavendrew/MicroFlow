export interface Session {
    uid: string,
    date: Date,
    data: number[]
    tempdata?: number[]
    indexes?: number[]
    sessionID?: number
    numSamples?: number
}

export interface RawDataPacket {
    sessionID: number,
    idx: number,
    data: number[]
}

export interface BreathingRateSession {
    sessionID: number,
    data: number[]
}