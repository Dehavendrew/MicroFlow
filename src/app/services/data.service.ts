import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, addDoc, deleteDoc, updateDoc, query, where, orderBy } from '@angular/fire/firestore';
import { endAt } from 'firebase/firestore';
import { Observable } from 'rxjs';
import { Session, RawDataPacket, BreathingRateSession } from './session';
import { Filesystem, Directory, Encoding, FilesystemDirectory, } from '@capacitor/filesystem';
import { ToastController } from '@ionic/angular';


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

  constructor(private toastCtrl: ToastController, private firestore: Firestore) { }

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

  getPacketsForSessionPromise(id):Promise<RawDataPacket[]>{
    const packetRef = collection(this.firestore, 'packets');
    const packetSessRef = query(packetRef, where("sessionID", "==", id), orderBy("idx"));
    return collectionData(packetSessRef, { idField: 'id'}).toPromise() as Promise<RawDataPacket[]>;
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

  deletePacket(packet: RawDataPacket){
    const noteDocRef = doc(this.firestore, `packets/${packet.id}`);
    return deleteDoc(noteDocRef);
  }

  deleteBreathingRate(bRate: BreathingRateSession){
    const noteDocRef = doc(this.firestore, `breathingRates/${bRate.id}`);
    return deleteDoc(noteDocRef);
  }

  updateNote(note: Note){
    const noteDocRef = doc(this.firestore, `notes`);
    return updateDoc(noteDocRef, {title: note.title, text: note.text});
  }

  async addLocalSession(session: Session, device: String){
    let maxFileSize = 1000000
    let fileName1 = "Session_" + session.sessionID
    let date = new Date(session.date)

    let data = session.data
    let tempdata = session.tempdata

    let toast = this.toastCtrl.create({
      message: 'Data Saved Succesfully',
      duration: 3000,
      position: 'bottom'
    });

    for(let i = 0; i < Math.ceil(data.length / maxFileSize); ++i){
      fileName1 = fileName1 + "_" + i + ".csv"
      let DataArray = [];
      let start = i * maxFileSize
      let end = i * maxFileSize + maxFileSize

      if(end > data.length){
        end = data.length
      }


      for(let idx = start; idx < end; ++idx){
        date = new Date(date.setMilliseconds(date.getMilliseconds() + 100))
        DataArray.push([date.toISOString(),data[idx], tempdata[idx]])
      }

      let csvContent =  DataArray.map(e => e.join(",")).join("\n");
      if (device == "web") {
        const data: string =  encodeURI("data:text/csv;charset=utf-8," + csvContent);
        const link: HTMLElement = document.createElement('a');
        link.setAttribute('href', data);
        link.setAttribute('download', fileName1);
        link.click();
        toast.then((res) => {
          res.present()
        })
        return;
      }
      else{
        const fileName = fileName1
          Filesystem.writeFile({
          encoding: Encoding.UTF8,
          path:fileName,
          data: csvContent,
          directory: FilesystemDirectory.Documents
        }).then(() => {
          toast.then((res) => {
            res.present()
          })
        })
      }
    }

  }

  async saveToDisk(session: Session, device: String){
    let numPackets = 0;
    let data = [];
    let tempdata = [];
    let maxFileSize = 1000000
    let fileName1 = "Session_" + session.sessionID
    let date = session.date.toDate()

    let toast = this.toastCtrl.create({
      message: 'Data Saved Succesfully',
      duration: 3000,
      position: 'bottom'
    });

    await this.getPacketsForSession(session.sessionID).subscribe((res) => {
      if(res.length > numPackets){
        numPackets = res.length
        res.forEach(el => {
          data = data.concat(el.data.slice(0,125))
          tempdata = tempdata.concat(el.data.slice(125,250))
        })


        for(let i = 0; i < Math.ceil(data.length / maxFileSize); ++i){
          fileName1 = fileName1 + "_" + i + ".csv"
          let DataArray = [];
          let start = i * maxFileSize
          let end = i * maxFileSize + maxFileSize

          if(end > data.length){
            end = data.length
          }


          for(let idx = start; idx < end; ++idx){
            date = new Date(date.setMilliseconds(date.getMilliseconds() + 100))
            DataArray.push([date.toISOString(),data[idx], tempdata[idx]])
          }

          let csvContent = DataArray.map(e => e.join(",")).join("\n");
          if (device == "web") {
            const data: string =  encodeURI("data:text/csv;charset=utf-8," + csvContent);
            const link: HTMLElement = document.createElement('a');
            link.setAttribute('href', data);
            link.setAttribute('download', fileName1);
            link.click();
            toast.then((res) => {
              res.present()
            })
            return;
          }
          else{
            const fileName = fileName1
              Filesystem.writeFile({
              encoding: Encoding.UTF8,
              path:fileName,
              data: csvContent,
              directory: FilesystemDirectory.Documents
              
            }).then(() => {
              toast.then((res) => {
                res.present()
              })
            })
          }
        }
      }
    })
  }

}
