import 'dart:convert';

import 'package:flutterapp/classes/environment.dart';
import 'package:http/http.dart' as http;

class RequestService {
  final _client = http.Client();

  Future<http.Response> getRequest(String endpoint) async {
    print('${Environment.serverUrl}/api/$endpoint');
    final url = Uri.parse('${Environment.serverUrl}/api/$endpoint');
    return _client.get(url);
  }

  Future<http.Response> customPostRequest(String address,
      Map<String, String> header, Map<String, dynamic> body) async {
    final url = Uri.parse(address);
    return _client.post(
      url,
      headers: header,
      body: json.encode(body),
    );
  }

  Future<http.Response> postRequest(
      String endpoint, Map<String, dynamic> body) async {
    final url = Uri.parse('${Environment.serverUrl}/api/$endpoint');
    return _client.post(
      url,
      headers: {
        'Content-Type': 'application/json',
      },
      body: json.encode(body),
    );
  }

  Future<http.Response> deleteRequest(String endpoint) async {
    final url = Uri.parse('${Environment.serverUrl}/api/$endpoint');
    return _client.delete(url);
  }

  Future<http.Response> patchRequest(
      String endpoint, Map<String, dynamic> body) async {
    final url = Uri.parse('${Environment.serverUrl}/api/$endpoint');
    return _client.patch(
      url,
      headers: {'Content-Type': 'application/json'},
      body: json.encode(body),
    );
  }

  Future<http.Response> putRequest(
      String endpoint, Map<String, dynamic> body) async {
    final url = Uri.parse('${Environment.serverUrl}/api/$endpoint');
    return _client.put(
      url,
      headers: {'Content-Type': 'application/json'},
      body: json.encode(body),
    );
  }

  void dispose() {
    _client.close();
  }
}
