import functools
import warnings
from enum import Enum


class Color(Enum):
	RED = "\033[91m"
	GREEN = "\033[92m"
	YELLOW = "\033[93m"
	BLUE = "\033[94m"
	MAGENTA = "\033[95m"
	CYAN = "\033[96m"
	WHITE = "\033[97m"
	RESET = "\033[0m"


def colorize(text, color=None):
	if color and isinstance(color, Color):
		return f"{color.value}{text}{Color.RESET.value}"
	return text


def _deprecated(reason="", category=DeprecationWarning, stacklevel=2):
	def decorator(func):
		@functools.wraps(func)
		def wrapper(*args, **kwargs):
			warnings.warn(
				f"{func.__name__} is deprecated. {reason}",
				category=category,
				stacklevel=stacklevel,
			)
			return func(*args, **kwargs)
		return wrapper
	return decorator
