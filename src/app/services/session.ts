export interface Session {
    uid: string,
    date: Date,
    data: number[]
    tempdata?: number[]
    indexes?: number[]
    sessionID?: number
    numSamples?: number
    id?: string
}

export interface RawDataPacket {
    sessionID: number,
    idx: number,
    data: number[]
    id?: string
}

export interface BreathingRateSession {
    sessionID: number,
    localOutliers: number[]
    data: number[]
    id?: string
}