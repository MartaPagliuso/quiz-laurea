import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SocketService } from './socket.service';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private socketService = inject(SocketService);
  
  constructor() {
  this.socketService.socket.on('connect', () => {
    console.log('Connesso al server!', this.socketService.socket.id);
  });
}
}
