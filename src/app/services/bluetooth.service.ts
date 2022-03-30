import { Injectable } from '@angular/core';
import { Session } from './session';
import { DataService } from './data.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BluetoothService {

  packetSize = 250
  numMetrics = 2
  currentLoadPercent = 0
  slidingWindowSize = 2
  timeout = 2000
  pointsPerGraph = 20

  testFailureRate = 0.0
  unAckedPackets: Number [] = []
  sentAckedPackets: Number [] = []
  

  constructor(private dataService: DataService) { }

  async sendPacketTest(i): Promise<number[]>{
    var dataArray: number[] = []
    for (let i = 0; i < this.packetSize / this.numMetrics; i++) {
      dataArray.push(4 * Math.sin(2*3.1415* 0.1 * i) + Math.random() + 8)
    }
    for (let i = 0; i < this.packetSize / this.numMetrics; i++) {
      dataArray.push(32 + Math.random())
    }

    if (true){
      return new Promise((resolve1, reject1) => {
        setTimeout(resolve => {
          this.unAckedPackets.push(i)
          var thresh = Math.random()
          if(thresh > this.testFailureRate){
              resolve1(dataArray)
          }
          else{
            console.log("LOST PACKET")
            reject1("Lost Packet")
          }
        }, 1)
      });
    }
    else{
      var msg = "Awating ACK " + this.unAckedPackets[0]
      console.log(msg)
      await this.awaitAckFromCentral().then((res) => {
        console.log("Got Ack")
        return new Promise((resolve1, reject1) => {
          setTimeout(resolve => {
            this.unAckedPackets.push(i)
            var thresh = Math.random()
            if(thresh > this.testFailureRate){
              console.log(thresh)
              resolve1(dataArray)
            }
            else{
              console.log("LOST PACKET")
              reject1("Lost Packet")
            }
            }, 1000)
        });
      }).catch((err) => console.log(err))
    }
  }

  async awaitAckFromCentral(){
    return new Promise((resolve, reject) => {
      var counter = 0
      console.log("Test")
      while(this.unAckedPackets.length >= this.slidingWindowSize){
        console.log(this.unAckedPackets.length)
        if(counter > this.timeout){
          console.log(counter)
          reject("Timeout")
          break
        }
        counter++
      }
      resolve
    })
  }

  async ackFromCentral(i) {
    var msg = "Preparing to send ACK " + i
    console.log(msg)
    var NumSecs = Math.floor(Math.random() * 10)
    return new Promise( resolve => {
      setTimeout(resolve1 => {
        this.sentAckedPackets.push(i)
        for (let idx = 0; idx < this.unAckedPackets.length; idx++){
          if(this.unAckedPackets[idx] == i){
            this.unAckedPackets.splice(idx, 1);
            var msg = "Sending ACK " + i
            console.log(msg)
            resolve
          }
        }
        resolve(msg)
      }
      , NumSecs) 
      })
  }

  async requestDataStream(sess: Session, writeLocal: boolean = false): Promise<Session>{
    this.currentLoadPercent = 0
    var numPackets = Math.ceil(sess.numSamples / (this.packetSize / this.numMetrics))
    var recievedPackets = 0
    var msg = "Requested data stream: " + sess.sessionID
    console.log(msg)

    var summaryPointsPerPacket = Math.ceil(this.pointsPerGraph / numPackets)
    var sizePointGap = Math.floor((this.packetSize / summaryPointsPerPacket) / this.numMetrics)

    var packetSep = numPackets / this.pointsPerGraph

    var summaryArray: number[] = []
    var tempsummaryArray: number[] = []
    var indexArray: number[] = []

    const average = (array) => array.reduce((a, b) => a + b) / array.length;

    for(let i = 0; i < numPackets; i++){
      msg = "Requesting Packet " + i
      console.log(msg)
      await this.sendPacketTest(i).then((res) => {
        msg = "Got Packet " + i
        console.log(msg)
        if(numPackets <= 20){
          for(let j = 0; j < summaryPointsPerPacket; ++j){
            summaryArray.push(average(res.slice(sizePointGap*j,sizePointGap*j + sizePointGap)))
            tempsummaryArray.push(average(res.slice((this.packetSize / this.numMetrics) + sizePointGap*j,(this.packetSize / this.numMetrics) + sizePointGap*j + sizePointGap)))
            indexArray.push(Math.ceil(sizePointGap * j + i * (this.packetSize / this.numMetrics) / 2))
          }
        }
        else{
          if(i == Math.floor(summaryArray.length * packetSep)){
            summaryArray.push(average(res.slice(0,this.packetSize / this.numMetrics)))
            tempsummaryArray.push(average(res.slice(this.packetSize / this.numMetrics, this.packetSize)))
            indexArray.push(Math.floor(i * this.packetSize / this.numMetrics))
          }
        }
        if(!writeLocal){
          this.dataService.addRawPacket({sessionID: sess.sessionID, idx: i, data: res}).then((res) => {
            recievedPackets++
            this.currentLoadPercent = recievedPackets / numPackets
          })
        }
      }).catch(err => i = i - 1)
      await this.ackFromCentral(i).then((res) => {console.log("Done acking")})
    }

    return new Promise(resolve => {
      sess.data = summaryArray
      sess.indexes = indexArray
      sess.tempdata = tempsummaryArray
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
      setTimeout(resolve, 1) 
      sess.data = dataArray
      resolve(sess)
    });
  }
}
