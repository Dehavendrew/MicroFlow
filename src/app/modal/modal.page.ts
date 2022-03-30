import { Component, OnInit, Input } from '@angular/core';
import { DataService, Note } from '../services/data.service';
import { ModalController, ToastController } from '@ionic/angular';
import { Session, BreathingRateSession } from '../services/session';
import { MLService } from '../services/ml.service';


@Component({
  selector: 'app-modal',
  templateUrl: './modal.page.html',
  styleUrls: ['./modal.page.scss'],
})
export class ModalPage implements OnInit {

  @Input() id: string;
  @Input() session: Session; 
  note: Note = null;

  constructor(private dataService: DataService, private modalCtrl: ModalController, private toastCtrl: ToastController, private mlService: MLService) { }

  ngOnInit() {
  }

  async closePage(){;
    this.modalCtrl.dismiss();
  }

  async performAnalysis(){
    await this.mlService.analyizeData(this.session);
    const toast = await this.toastCtrl.create({
      message: 'Analysis Completed',
      duration: 2000
    });
    toast.present()
  }

}
