// import 'package:firebase_auth/firebase_auth.dart';
// import 'package:firebase_database/firebase_database.dart';
// import 'package:flutter/material.dart';
// import 'package:flutterapp/screens/Account.dart';
// import 'package:flutterapp/screens/FriendRequests.dart';
// import 'package:flutterapp/screens/FriendSearch.dart';
// import 'package:flutterapp/screens/FriendsList.dart';
// import 'package:flutterapp/screens/login.dart';
// import 'package:flutterapp/services/socket_client_service.dart';

// import 'chat.dart';

// class Home extends StatefulWidget {
//   const Home({super.key});
//   @override
//   State<Home> createState() => HomeState();
// }

// class HomeState extends State<Home> {
//   final userNameController = TextEditingController();
//   final SocketClientService socketService = SocketClientService();
//   final user = FirebaseAuth.instance.currentUser;
//   final DatabaseReference _userRef =
//       FirebaseDatabase.instance.reference().child('users');
//   bool get isUserNameValid => userNameController.text.isNotEmpty;

//   @override
//   void initState() {
//     super.initState();
//     connectAndSetupSocket();
//   }

//   Future<void> connectAndSetupSocket() async {
//     await socketService.connect();
//     socketService.on('register-success', (data) {
//       _saveUsername();
//     });
//     socketService.on('register-error', (data) {
//       _showError(data as String);
//     });
//   }

//   void _saveUsername() {
//     Navigator.push(
//       context,
//       MaterialPageRoute(
//         builder: (context) => const Chat(),
//       ),
//     ).whenComplete(() {
//       socketService.removeAllListeners();
//       socketService.disconnect();
//       connectAndSetupSocket();
//     });
//   }

//   void _showError(String error) {
//     showDialog(
//       context: context,
//       builder: (BuildContext context) {
//         return AlertDialog(
//           title: const Text('Erreur'),
//           content: Text(error),
//           actions: <Widget>[
//             TextButton(
//               onPressed: () => Navigator.of(context).pop(),
//               child: const Text('OK'),
//             ),
//           ],
//         );
//       },
//     );
//   }

//   void navigateToAccountPage() {
//     Navigator.push(
//       context,
//       MaterialPageRoute(builder: (context) => const AccountPage()),
//     );
//   }

//   void navigateToFriendsSearch() {
//     Navigator.push(
//       context,
//       MaterialPageRoute(builder: (context) => const FriendSearch()),
//     );
//   }

//   void navigateToFriendsRequests() {
//     Navigator.push(
//       context,
//       MaterialPageRoute(builder: (context) => const FriendRequestsPage()),
//     );
//   }

//   void navigateToFriendsList() {
//     Navigator.push(
//       context,
//       MaterialPageRoute(builder: (context) => const FriendsList()),
//     );
//   }

//   void signUserOut() {
//     FirebaseAuth.instance.signOut().then((_) {
//       _userRef.child(user!.uid).update({'isLoggedIn': false}).then((_) {
//         Navigator.of(context).pushReplacement(
//           MaterialPageRoute(builder: (context) => const Login()),
//         );
//       }).catchError((error) {
//         print('Error updating user status: $error');
//       });
//     }).catchError((error) {
//       print('Error signing out: $error');
//     });
//   }

//   @override
//   Widget build(BuildContext context) {
//     return Scaffold(
//         appBar: AppBar(
//           title: Row(
//             children: [
//               const Text('Prototype de chat'),
//               const SizedBox(width: 16),
//               StreamBuilder(
//                 stream:
//                     _userRef.orderByChild('isLoggedIn').equalTo(true).onValue,
//                 builder: (context, AsyncSnapshot snapshot) {
//                   if (snapshot.hasData &&
//                       snapshot.data!.snapshot.value != null) {
//                     int onlineUsersCount =
//                         (snapshot.data!.snapshot.value as Map).length;
//                     return Chip(
//                       label: Text('Online users: $onlineUsersCount'),
//                     );
//                   } else {
//                     return const SizedBox();
//                   }
//                 },
//               ),
//             ],
//           ),
//           actions: [
//             Text("Connected with email: ${user?.email}"),
//             IconButton(
//               icon: const Icon(Icons.person_add),
//               onPressed: () {
//                 navigateToFriendsSearch();
//               },
//             ),
//             IconButton(
//               icon: const Icon(Icons.people),
//               onPressed: () {
//                 navigateToFriendsList();
//               },
//             ),
//             IconButton(
//               icon: const Icon(Icons.notifications),
//               onPressed: () {
//                 navigateToFriendsRequests();
//               },
//             ),
//             IconButton(
//               icon: const Icon(Icons.person),
//               onPressed: () {
//                 navigateToAccountPage();
//               },
//             ),
//             IconButton(
//               icon: const Icon(Icons.logout),
//               onPressed: () {
//                 signUserOut();
//               },
//             ),
//           ],
//         ),
//         body: Center(
//           child: SizedBox(
//             width: 250,
//             child: Column(
//               mainAxisAlignment: MainAxisAlignment.center,
//               crossAxisAlignment: CrossAxisAlignment.start,
//               children: <Widget>[
//                 TextField(
//                   controller: userNameController,
//                   onChanged: (value) {
//                     setState(() {});
//                   },
//                   decoration: const InputDecoration(
//                     hintText: 'Entrez votre nom d\'utilisateur',
//                   ),
//                 ),
//                 const SizedBox(height: 16),
//                 Align(
//                   alignment: Alignment.centerRight,
//                   child: TextButton(
//                     onPressed: isUserNameValid
//                         ? () => socketService.send(
//                             'register', userNameController.text)
//                         : null,
//                     style: TextButton.styleFrom(
//                       foregroundColor: Theme.of(context).colorScheme.onPrimary,
//                       backgroundColor: Theme.of(context).colorScheme.primary,
//                     ),
//                     child: const Text("Commencer"),
//                   ),
//                 )
//               ],
//             ),
//           ),
//         ));
//   }
// }
