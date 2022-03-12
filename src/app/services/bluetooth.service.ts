import { Injectable } from '@angular/core';
import { Session } from './session';
import { DataService } from './data.service';

@Injectable({
  providedIn: 'root'
})
export class BluetoothService {

  packetSize = 250
  numMetrics = 2
  currentLoadPercent = 0

  constructor(private dataService: DataService) { }

  async sendPacketTest(i): Promise<number[]>{
    var dataArray: number[] = []
    for (let i = 0; i < this.packetSize / this.numMetrics; i++) {
      dataArray.push(Math.random())
      dataArray.push(32)
    }

    return new Promise( resolve1 => {
      setTimeout(resolve => {
        resolve1(dataArray)}, 1000)
    });
  }

  async requestDataStream(sess: Session): Promise<Session>{
    this.currentLoadPercent = 0
    var numPackets = Math.ceil(sess.numSamples / (this.packetSize / this.numMetrics))
    var recievedPackets = 0
    var msg = "requested data stream: " + sess.id
    console.log(msg)

    var summaryArray: number[] = []

    const average = (array) => array.reduce((a, b) => a + b) / array.length;

    for(let i = 0; i < numPackets; i++){
      msg = "waiting for packet " + i
      console.log(msg)
      await this.sendPacketTest(i).then((res) => {
        summaryArray.push(average(res))
        this.dataService.addRawPacket({sessionID: sess.id, idx: i, data: res}).then((res) => {
          recievedPackets++
          this.currentLoadPercent = recievedPackets / numPackets
        })
      })
    }

    return new Promise(resolve => {
      sess.data = summaryArray
      resolve(sess)
    })
  }


  async downloadStoredDataTest(sess: Session): Promise<Session>{
    var dataArray: number[] = []
    for (let i = 0; i < sess.numSamples; i++) {
      dataArray.push(Math.random())
      dataArray.push(0)
    }

    return new Promise( resolve => {
      setTimeout(resolve, 1000) 
      sess.data = dataArray
      resolve(sess)
    });
  }
}
