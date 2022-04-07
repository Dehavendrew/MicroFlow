import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import * as tf from "@tensorflow/tfjs"
import { scalar } from '@tensorflow/tfjs';

@Injectable({
  providedIn: 'root'
})
export class MLService {

  percentDone: number = 0;

  constructor(private dataService: DataService) { }
 

  async analyizeData(session){
    if(session){
      var id = session.sessionID
      var breathingRate: number[] = []
      var localOutlierIdx: number[] = []
      var localShockIdx: number[] = []
      // var globalOutlierIdx: number[] = []
      // var globalShockIdx: number[] = []

  
      //Hanning Windows 
      let Window = tf.signal.hannWindow(62)
      Window = Window.pad([[31, 31]])
  
      this.dataService.getPacketsForSession(id).subscribe((res) => {
        res.forEach((val, num) => {
          
          let packetData = tf.tensor1d(val.data.slice(0,124))
          let packetDataDer = tf.sub(packetData.slice(0,123), packetData.slice(1,123))
          
          
          let packetMoments = tf.moments(packetData, 0, true) 
          let packetDerMoments = tf.moments(packetDataDer, 0, true)
          let packetStd = tf.sqrt(packetMoments.variance)
          let packetDerStd = tf.sqrt(packetDerMoments.variance)
  
          //remove dc componenet
          packetData = tf.sub(packetData, packetMoments.mean)
          packetDataDer = tf.sub(packetDerMoments.mean, packetDataDer)
  
          //Find Local Outliers
          let isOutlier = tf.abs(packetData).greater(packetStd.mul(tf.scalar(2)))
          tf.whereAsync(isOutlier).then(data => {
            data.data().then(idxs => {
              idxs.forEach(loc => {
                localOutlierIdx.push((loc + (num * 125)) / 10)
              })
            })
          })

          let isShock = packetDataDer.greater(packetDerStd.mul(tf.scalar(3)))
          tf.whereAsync(isShock).then(data => {
            data.data().then(idxs => {
              idxs.forEach(loc => {
                localShockIdx.push((loc + (num * 125)) / 10)
              })
            })
          })
  
          //Window data
          packetData = tf.mul(packetData, Window)
  
          //Perform fft
          let freqData = tf.spectral.rfft(packetData)
  
          freqData = tf.abs(freqData)

  
          tf.argMax(freqData).data().then(data => {
            freqData.data().then(freqD => {
              let maxIdx = data[0]
              //Weight average max index
              if(maxIdx > 0){
                maxIdx = maxIdx - (0.5 * freqD[maxIdx - 1]/freqD[maxIdx])
              }
              if(maxIdx < 60){
                maxIdx = maxIdx + (0.5 * freqD[maxIdx + 1]/freqD[maxIdx])
              }
              breathingRate.push(data[0] * 10 / 124 * 60)
  
              //Write to Database
              if(breathingRate.length == res.length){
                this.dataService.addBreathingRate({sessionID: id, data: breathingRate, localOutliers: localOutlierIdx, localShocks: localShockIdx})
                return {sessionID: id, data: breathingRate, localOutliers: localOutlierIdx, localShocks: localShockIdx}
              }
            })
          }) 
        })
      })
    }
  }
}
