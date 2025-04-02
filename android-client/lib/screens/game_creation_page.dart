import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "Création d'un nouveau jeu",
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: NewGameCreationPage(),
    );
  }
}

class NewGameCreationPage extends StatefulWidget {
  const NewGameCreationPage({Key? key}) : super(key: key);

  @override
  _NewGameCreationPageState createState() => _NewGameCreationPageState();
}

class _NewGameCreationPageState extends State<NewGameCreationPage> {
  double _sliderValueRadius = 1.0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(),
        title: const Text("Création d'un nouveau jeu"),
        actions: <Widget>[
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: TextButton(
              onPressed: () {
                // TODO: Implement validation and game creation logic
              },
              child: const Text('Valider et Créer',
                  style: TextStyle(color: Colors.white)),
              style: TextButton.styleFrom(
                backgroundColor: Color.fromRGBO(0, 0, 255, 1),
                padding: const EdgeInsets.symmetric(
                    horizontal: 16.0, vertical: 16.0),
                shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.all(Radius.circular(4.0)),
                ),
              ),
            ),
          ),
        ],
      ),
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Container(
                      width: MediaQuery.of(context).size.width * 0.3,
                      child: SliderTheme(
                        data: const SliderThemeData(
                          thumbColor: Color.fromRGBO(0, 0, 255, 1),
                          activeTrackColor: Color.fromRGBO(0, 0, 255, 1),
                          inactiveTrackColor: Color.fromRGBO(0, 0, 255, 1),
                        ),
                        child: Slider(
                          min: 0,
                          max: 8,
                          value: _sliderValueRadius,
                          onChanged: (value) {
                            setState(() {
                              _sliderValueRadius = value;
                            });
                          },
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildImageContainer("Image principale"),
                      Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _buildMiddleButton(Icons.arrow_upward), // Up arrow
                          _buildMiddleButton(
                              Icons.arrow_downward), // Down arrow
                          _buildMiddleButton(
                              Icons.arrow_forward), // Right arrow
                          _buildMiddleButton(Icons.arrow_back), // Left arrow
                          _buildMiddleButton(
                              Icons.refresh), // Refresh or reload icon
                        ],
                      ),
                      _buildImageContainer("Image modifiée"),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Container(
            width: 120,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Padding(
                  padding: EdgeInsets.only(bottom: 16.0),
                  child: Text(
                    'Outils de dessin',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
                _buildCircleTool(Icons.brush, "Crayon", () {
                  // TODO: Add brush logic
                }),
                _buildCircleTool(Icons.crop_square, "Rectangle", () {
                  // TODO: Add square logic
                }),
                _buildCircleTool(Icons.radio_button_unchecked, "Cercle", () {
                  // TODO: Add circle logic
                }),
                _buildCircleTool(Icons.remove, "Efface", () {
                  // TODO: Add eraser logic
                }),
                // Add more tools as needed
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImageContainer(String title) {
    return Expanded(
      child: Column(
        children: [
          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 20,
            ),
          ),
          Container(
            height: 450,
            margin: const EdgeInsets.all(10),
            color: Colors.grey[300],
            // TODO: Add logic to display image here
          ),
          // Control buttons row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              IconButton(
                icon: const Icon(Icons.upload),
                onPressed: () {
                  // TODO: Add upload logic
                },
                tooltip: 'Téléverser', // Tooltip on hover for upload button
              ),
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: () {
                  // TODO: Add refresh logic
                },
                tooltip: 'Recharger', // Tooltip on hover for refresh button
              ),
              IconButton(
                icon: const Icon(CupertinoIcons.trash),
                onPressed: () {
                  // TODO: Add delete logic
                },
                tooltip:
                    'Supprimer', // Tooltip on hover for trash/delete button
              ),
            ],
          ),
        ],
      ),
    );
  }

  // Helper method to build the middle buttons between image containers
  Widget _buildMiddleButton(IconData icon) {
    return IconButton(
      icon: Icon(icon, size: 30.0), // Adjust the size if needed
      color: Color.fromRGBO(0, 0, 255, 1), // Change the color if needed
      onPressed: () {
        // TODO: Implement button functionality
      },
    );
  }

  // Helper method to build circle-shaped tool buttons with tooltip
  Widget _buildCircleTool(
      IconData icon, String tooltipMessage, VoidCallback onPressed) {
    return Tooltip(
      message: tooltipMessage,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8.0),
        child: CircleAvatar(
          radius: 25,
          backgroundColor: Color.fromRGBO(0, 0, 255, 1),
          child: IconButton(
            icon: Icon(icon, color: Colors.white),
            onPressed: onPressed,
          ),
        ),
      ),
    );
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// --> https://api.flutter.dev/flutter/material/Icons-class.html
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
