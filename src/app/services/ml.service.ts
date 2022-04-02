import { Injectable } from '@angular/core';
import { DataService } from './data.service';

@Injectable({
  providedIn: 'root'
})
export class MLService {

  constructor(private dataService: DataService) { }

  async analyizeData(session){
    var id = session.sessionID
    var breathingRate: number[] = []

    this.dataService.getPacketsForSession(id).subscribe((res) => {
      res.forEach((val) => {
        breathingRate.push(val.data[0])
      })

      this.dataService.addBreathingRate({sessionID: id, data: breathingRate})
    })
    return {sessionID: id, data: breathingRate}
  }
}
