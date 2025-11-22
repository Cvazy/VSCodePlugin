import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * Ищем установленные компиляторы в системе
 * @returns Массив путей к найденным компиляторам
 */
export async function findCompilers(): Promise<string[]> {
	const platform = process.platform;
	const compilers: string[] = [];

	// Определяем команду поиска в зависимости от ОС
	const searchCommand = platform === 'win32' ? 'where' : 'which';

	// Список компиляторов для поиска
	const compilersToFind = ['gcc', 'clang'];

	// Ищем каждый компилятор
	for (const compiler of compilersToFind) {
		try {
			const { stdout } = await execPromise(`${searchCommand} ${compiler}`);
			
			// Парсим вывод (может быть несколько строк)
			const paths = stdout
				.split('\n')
				.map(line => line.trim())
				.filter(line => line.length > 0);

			// Добавляем найденные пути
			compilers.push(...paths);
		} catch (error) {
			// Компилятор не найден — просто игнорируем
			// Не добавляем ничего в список
		}
	}

	// Убираем дубли и пустые строки
	const uniqueCompilers = [...new Set(compilers)].filter(path => path.length > 0);

	return uniqueCompilers;
}

