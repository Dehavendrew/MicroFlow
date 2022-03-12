import { Component, OnInit } from '@angular/core';
import { Session } from '../services/session';
import { ToastController } from '@ionic/angular';
import { DataService } from '../services/data.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AuthService } from '../services/auth.service';
import { User } from '../services/user';
import { Observable } from 'rxjs';
import { BluetoothService } from '../services/bluetooth.service';

export interface Task {
  session: Session,
  id: number,
  task: string,
  completed: boolean
}

@Component({
  selector: 'app-connect',
  templateUrl: './connect.page.html',
  styleUrls: ['./connect.page.scss'],
})
export class ConnectPage implements OnInit {

  isLoading: boolean
  isLoaded: boolean
  isQuerying: boolean
  isQueried: boolean
  isImporting: boolean
  isImported: boolean
  DownloadLocal: boolean

  deviceName: string
  numSessionsOnDisk: number
  numMinutesOnDisk: number
  sessions: Session[] = [];

  taskQueue: Task[] = []

  user: User

  constructor(private toastCtrl: ToastController, private dataService: DataService, public afAuth: AngularFireAuth, public authService: AuthService, private bleService: BluetoothService) {
    this.resetPairing()
    this.authStatusListener()
   }

  ngOnInit() {
  }

  authStatusListener(){
    this.afAuth.onAuthStateChanged((cred) => {
      if(cred){
        this.user = cred
      }
      else{
        this.user = null
      }
    })
  }


  async searchForDevice(){
    console.log("Searching For Device")
    this.isLoading = true
    return new Promise( resolve => {
      setTimeout(resolve, 1000) 

      this.deviceName = "Drew's Micro Flow"
    });
  }

  async queryDevice(){
    console.log("Querying For Device")
    this.isQuerying = true;
    return new Promise( resolve => {
      setTimeout(resolve, 1000) 

      var Numsamples = 0

      for (let j = 0; j < 5; j++){
        var currentTime = new Date()
        var sess_id = Math.floor(Math.random() * 1000000000)
        var NumsamplesTest = Math.floor(Math.random() * 1000)
        this.sessions.push({uid: this.user.uid, date: currentTime, data: null, id:sess_id, numSamples: NumsamplesTest })
        Numsamples = Numsamples + NumsamplesTest
      }
      
      this.numSessionsOnDisk = this.sessions.length
      this.numMinutesOnDisk = Numsamples / 10

    });
  }

  async cloudWrite(i){
    if(await this.checkTaskInQueue(i)){
      return
    }
    
    this.isImporting = true
    let msg = "Writing Session " + i + " To Firebase"
    console.log(msg)

    let sess = null
    for (let idx = 0; idx < this.sessions.length; idx++){
      if(this.sessions[idx].id == i){
        sess = this.sessions[idx]
      }
    }

    this.taskQueue.push({session: sess, id: i, task: "Cloud Write ", completed: false})

    this.bleService.requestDataStream(sess).then((res) => {
      this.dataService.addSession(res).then(res => {
        for (let task of this.taskQueue) {
          if(task.id == i){
            task.completed = true
            console.log("Done")
          }
        }
        for (let idx = 0; idx < this.sessions.length; idx++){
          if(this.sessions[idx].id == i){
            this.sessions.splice(idx, 1);
          }
        }
        this.updateStats()
      })
    })
  }

  async localWrite(i){
    this.isImporting = true
    let msg = "Writing Session " + i + " To Local"
    console.log(msg)
  }

  async delete(i){
    if(await this.checkTaskInQueue(i)){
      return
    }
    this.isImporting = true
    let msg = "Deleting Session " + i
    console.log(msg)
    this.taskQueue.push({session: this.sessions[i], id: i, task: "Delete ", completed: false})
    this.removeDataFromMF(i).then(res => {
      for (let task of this.taskQueue) {
        if(task.id == i){
          task.completed = true
          console.log("Done")
        }
      }
      for (let idx = 0; idx < this.sessions.length; idx++){
        if(this.sessions[idx].id == i){
          this.sessions.splice(idx, 1);
        }
      }
      this.updateStats()
    })
  }

  async updateStats(){
    let numsamples = 0
    for (let idx = 0; idx < this.sessions.length; idx++){
      numsamples = numsamples + this.sessions[idx].numSamples
    }
    this.numSessionsOnDisk = this.sessions.length
    this.numMinutesOnDisk = numsamples / 10
  }

  async checkTaskInQueue(i){
    for (let task of this.taskQueue) {
      if(task.id == i && !task.completed){
        const toast = await this.toastCtrl.create({
          message: 'A Task for This Session is Already in the Queue',
          duration: 2000
        });
        toast.present()
        return true
      }
    }
    return false
  }

  async removeDataFromMF(i){
    return new Promise( resolve => {
      setTimeout(resolve, 1000) 
      return i
    });
  }

  async loadOffline(){
    this.DownloadLocal = true
  }

  async pair(){
    this.resetPairing()

    console.log("Begining Pairing")
    await this.searchForDevice()
    this.isLoaded = true

    await this.queryDevice()
    this.isQueried = true
    console.log("done")
  }

  resetPairing(){
    this.isLoading = false
    this.isLoaded = false
    this.isQuerying = false
    this.isQueried = false
    this.isImporting = false
    this.isImported = false
    this.sessions = []
    this.deviceName = null
    this.numMinutesOnDisk = null
    this.numSessionsOnDisk = null
    this.DownloadLocal = false
    this.taskQueue = []
  }

}
