import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, addDoc, deleteDoc, updateDoc, query, where, orderBy } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Session, RawDataPacket, BreathingRateSession } from './session';


export interface Note{
  id?: string;
  title: string;
  text: string;
  uid: string;
} 

@Injectable({
  providedIn: 'root'
})
export class DataService {

  uid: string

  constructor(private firestore: Firestore) { }

  getNotes(uid): Observable<Note[]>{
    const notesRef = collection(this.firestore, 'notes');
    const usernotesRef = query(notesRef, where("uid", "==", uid));
    return collectionData(usernotesRef, { idField: 'id'}) as Observable<Note[]>;
  }

  getSessions(uid): Observable<Session[]>{
    const sessRef = collection(this.firestore, 'sessions');
    const userSessRef = query(sessRef, where("uid", "==", uid), orderBy("date", 'desc'));
    return collectionData(userSessRef, { idField: 'id'}) as Observable<Session[]>;
  }

  getNoteById(id):Observable<Note>{
    const noteDocRef = doc(this.firestore, `notes/${id}`);
    return docData(noteDocRef, { idField: 'id'}) as Observable<Note>;
  }

  getBreathingById(id):Observable<BreathingRateSession[]>{
    const sessref = collection(this.firestore, `breathingRates`);
    const breathingRef = query(sessref, where("sessionID", "==", id))
    return collectionData(breathingRef, { idField: 'id'}) as Observable<BreathingRateSession[]>;
  }

  getPacketsForSession(id):Observable<RawDataPacket[]>{
    const packetRef = collection(this.firestore, 'packets');
    const packetSessRef = query(packetRef, where("sessionID", "==", id), orderBy("idx"));
    return collectionData(packetSessRef, { idField: 'id'}) as Observable<RawDataPacket[]>;
  }

  addNote(note: Note){
    const notesRef = collection(this.firestore, 'notes');
    return addDoc(notesRef, note);
  }

  addSession(session: Session){
    const sessionRef = collection(this.firestore, 'sessions');
    return addDoc(sessionRef, session)
  }

  addBreathingRate(session: BreathingRateSession){
    const BreathingRef = collection(this.firestore, 'breathingRates');
    return addDoc(BreathingRef, session)
  }

  addRawPacket(packet: RawDataPacket){
    const packetRef = collection(this.firestore, 'packets');
    return addDoc(packetRef, packet)
  }

  deleteNote(note: Note){
    const noteDocRef = doc(this.firestore, `notes/${note.id}`);
    return deleteDoc(noteDocRef);
  }

  deleteSession(session: Session){
    const noteDocRef = doc(this.firestore, `sessions/${session.id}`);
    return deleteDoc(noteDocRef);
  }

  updateNote(note: Note){
    const noteDocRef = doc(this.firestore, `notes`);
    return updateDoc(noteDocRef, {title: note.title, text: note.text});
  }

}
