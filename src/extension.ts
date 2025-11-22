import * as vscode from 'vscode';
import { findCompilers, compileToAssembly } from './compilerHandler';

// Переменная для кнопки в Status Bar
let statusBarItem: vscode.StatusBarItem;

/**
 * Функция активации расширения
 */
export function activate(context: vscode.ExtensionContext): void {
	console.log('C to ASM extension активировано!');

	// Регистрируем команду компиляции
	const compileCommand = vscode.commands.registerCommand('extension.compileToAsm', async () => {
		// Проверяем, что открыт файл
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			vscode.window.showErrorMessage('Нет активного файла для компиляции!');
			return;
		}

		// Сохраняем файл перед компиляцией (если есть несохранённые изменения)
		if (activeEditor.document.isDirty) {
			await activeEditor.document.save();
		}

		const sourceFilePath = activeEditor.document.uri.fsPath;

		// Ищем доступные компиляторы
		const compilers = await findCompilers();

		// Если компиляторы не найдены — показываем ошибку
		if (compilers.length === 0) {
			vscode.window.showErrorMessage('Компиляторы не найдены! Установите GCC или Clang');
			return;
		}

		// Показываем список компиляторов для выбора
		const selected = await vscode.window.showQuickPick(compilers, {
			placeHolder: 'Выберите компилятор для сборки'
		});

		// Если пользователь не выбрал компилятор или отменил
		if (!selected) {
			return;
		}

		// Компилируем с прогресс-баром
		try {
			const asmCode = await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'Компиляция в Assembly...',
				cancellable: false
			}, async (progress) => {
				progress.report({ message: 'Запуск компилятора...' });
				return await compileToAssembly(selected, sourceFilePath);
			});

			// Создаём новый документ с ASM кодом
			const doc = await vscode.workspace.openTextDocument({
				content: asmCode,
				language: 'asm'
			});

			// Показываем документ во второй колонке (split screen)
			await vscode.window.showTextDocument(doc, {
				viewColumn: vscode.ViewColumn.Beside,
				preserveFocus: true
			});

			vscode.window.showInformationMessage('Компиляция успешно завершена!');
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
			vscode.window.showErrorMessage(`Ошибка компиляции: ${errorMessage}`);
		}
	});

	// Создаём кнопку в Status Bar справа
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = '$(file-binary) To ASM';
	statusBarItem.command = 'extension.compileToAsm';
	statusBarItem.tooltip = 'Скомпилировать C/C++ в Assembly';
	statusBarItem.hide(); // Прячем по умолчанию

	// Проверяем текущий активный редактор при старте
	updateStatusBarVisibility(vscode.window.activeTextEditor);

	// Слушаем изменение активного редактора
	const editorChangeListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
		updateStatusBarVisibility(editor);
	});

	// Добавляем всё в подписки для правильной очистки
	context.subscriptions.push(compileCommand);
	context.subscriptions.push(statusBarItem);
	context.subscriptions.push(editorChangeListener);
}

/**
 * Показываем или прячем кнопку в зависимости от языка файла
 */
function updateStatusBarVisibility(editor: vscode.TextEditor | undefined): void {
	if (!editor) {
		statusBarItem.hide();
		return;
	}

	const languageId = editor.document.languageId;
	
	// Показываем кнопку только для C и C++
	if (languageId === 'c' || languageId === 'cpp') {
		statusBarItem.show();
	} else {
		statusBarItem.hide();
	}
}

/**
 * Функция деактивации расширения
 */
export function deactivate(): void {
	// Очистка ресурсов при деактивации
}

