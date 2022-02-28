import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, addDoc, deleteDoc, updateDoc, query, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/compat/auth';


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

  getNoteById(id):Observable<Note>{
    const noteDocRef = doc(this.firestore, `notes/${id}`);
    return docData(noteDocRef, { idField: 'id'}) as Observable<Note>;
  }

  addNote(note: Note){
    const notesRef = collection(this.firestore, 'notes');
    return addDoc(notesRef, note);
  }

  deleteNote(note: Note){
    const noteDocRef = doc(this.firestore, `notes/${note.id}`);
    return deleteDoc(noteDocRef);
  }

  updateNote(note: Note){
    const noteDocRef = doc(this.firestore, `notes/${note.id}`);
    return updateDoc(noteDocRef, {title: note.title, text: note.text});
  }

}
