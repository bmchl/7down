// https://medium.com/@ArunPradhan14/how-to-connect-sockets-in-flutter-a-comprehensive-guide-by-arun-pradhan-d50f246ce40f

import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "Jeu des différences",
      home: InterfaceGamePage(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class InterfaceGamePage extends StatefulWidget {
  @override
  _InterfaceGamePageState createState() => _InterfaceGamePageState();
}

class _InterfaceGamePageState extends State<InterfaceGamePage> {
  IO.Socket? socket;
  String matchId =
      ''; // Ajoutez l'identifiant de la partie que le client léger doit rejoindre

  @override
  void initState() {
    super.initState();
    // Connexion au serveur
    final socket = IO.io('http://192.168.1.31:3000', <String, dynamic>{
      'transports': ['websocket'],
      'autoConnects': false,
    });

    socket.on('connect', (_) {
      print('Connected to the server');
      // Écouter les événements spécifiques
      socket.on('partie-créée', (data) {
        // Mettez à jour l'état avec les informations de la partie
        print('Partie créée: $data');
      });
      socket.on('update-match-info', (data) {
        // Mettez à jour l'état avec les informations de la partie
        print('Mise à jour de la partie: $data');
        if (data['matchId'] == matchId) {
          // Mettre à jour l'interface utilisateur pour refléter l'état de la partie
        }
      });
    });
  }

  // void joinGame(String gameId) {
  //   print('JOINGAME');
  //   socket?.emit('c/join-lobby', {'matchId': gameId});
  // }

  void joinGame(String gameId) {
    print('JOINGAME');
    socket?.emit('c/join-lobby', {
      'matchId': gameId,
      'clientType': 'light',
    });
  }

  void abandonGame() {
    print('LEAVEGAME');
    socket?.emit('c/abandon-game', {'matchId': matchId});
  }

  @override
  void dispose() {
    // Déconnexion du serveur
    socket?.disconnect();
    super.dispose();
  }

  double imageContainerWidth = 500;
  double imageContainerHeight = 400;
  double borderRadiusValue = 25;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white.withOpacity(0.7),
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Material(
                borderRadius: BorderRadius.circular(borderRadiusValue),
                elevation: 5,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16.0, vertical: 8.0),
                  decoration: BoxDecoration(
                    color: Color.fromRGBO(224, 221, 240, 0.3).withOpacity(0.8),
                    borderRadius: BorderRadius.circular(borderRadiusValue),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Map:",
                        style: TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.bold,
                          fontSize: 22,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            "Mode de jeu:",
                            style: TextStyle(
                              color: Colors.black,
                              fontSize: 16,
                            ),
                          ),
                          Spacer(),
                          const Text(
                            "Niveau de difficulté:",
                            style: TextStyle(
                              color: Colors.black,
                              fontSize: 16,
                            ),
                          ),
                          Spacer(),
                          ElevatedButton(
                            onPressed: () {
                              // Implement the abandon game logic
                              socket?.emit('c/abandon-game');
                              print('LEAVEGAME');
                            },
                            child: Text(
                              'Abandonner',
                              style: TextStyle(color: Colors.black),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Color.fromRGBO(224, 196, 197, 1),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(18.0),
                              ),
                              padding: EdgeInsets.symmetric(
                                  horizontal: 20, vertical: 10),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
            SizedBox(height: 20),
            // Body
            Expanded(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildImageContainer(),
                  _buildImageContainer(),
                ],
              ),
            ),
            SizedBox(height: 20),
            // Footer
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Material(
                borderRadius: BorderRadius.circular(borderRadiusValue),
                elevation: 20,
                child: Container(
                  height: 100,
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16.0, vertical: 8.0),
                  decoration: BoxDecoration(
                    color: Color.fromRGBO(224, 221, 240, 0.3).withOpacity(0.8),
                    borderRadius: BorderRadius.circular(borderRadiusValue),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Chronomètre',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      Spacer(),
                      Text(
                        'Différences trouvées par',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      Spacer(),
                      Text(
                        'Différences trouvées par',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildImageContainer() {
    return Container(
      width: imageContainerWidth,
      height: imageContainerHeight,
      margin: const EdgeInsets.all(0),
      decoration: BoxDecoration(
        border: Border.all(
            color: Color.fromRGBO(224, 221, 240, 0.3).withOpacity(0.8),
            width: 15),
        color: Colors.white,
      ),
    );
  }
}
