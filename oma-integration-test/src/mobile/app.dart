import 'package:flutter/material.dart';

void main() => runApp(const TodoApp());

class TodoApp extends StatelessWidget {
  const TodoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '할 일 목록',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF4A90D9)),
        useMaterial3: true,
      ),
      home: const TodoListScreen(),
    );
  }
}

class TodoListScreen extends StatefulWidget {
  const TodoListScreen({super.key});

  @override
  State<TodoListScreen> createState() => _TodoListScreenState();
}

class _TodoListScreenState extends State<TodoListScreen> {
  final List<Map<String, dynamic>> _todos = [
    {'id': 1, 'title': '프로젝트 설계', 'done': false},
    {'id': 2, 'title': '코드 리뷰', 'done': true},
  ];
  final TextEditingController _controller = TextEditingController();

  void _addTodo() {
    if (_controller.text.trim().isEmpty) return;
    setState(() {
      _todos.add({
        'id': _todos.length + 1,
        'title': _controller.text.trim(),
        'done': false,
      });
      _controller.clear();
    });
  }

  void _toggleTodo(int index) {
    setState(() {
      _todos[index]['done'] = !_todos[index]['done'];
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('할 일 목록')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: const InputDecoration(hintText: '새로운 할 일'),
                  ),
                ),
                IconButton(onPressed: _addTodo, icon: const Icon(Icons.add)),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: _todos.length,
              itemBuilder: (context, index) {
                final todo = _todos[index];
                return CheckboxListTile(
                  title: Text(todo['title']),
                  value: todo['done'],
                  onChanged: (_) => _toggleTodo(index),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
