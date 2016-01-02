function EditBox(x, y, width, height, text, style)
{
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.scrollX = 0;
	this.scrollY = 0;
	this.text = text || '';
	this.style = style || EditBox.defaultStyle;
	this.focus = false;
	this.cursor = 0;
	this.hasSelection = false;
	this.selectionPivot = 0;
	this.align = EditBox.LeftAlign;
	this.numeric = false;
}

EditBox.LeftAlign = 0;
EditBox.RightAlign = 1;

EditBox.defaultStyle = {
	padding : 2,
	font : 'Sans',
	fontSize : 16,
	fontColor : 'black',
	background : 'white',
	border : { color: '#a9a9a9', width : 1 },
	focusBorder : { color: '#7a9cd3', width : 1 },
	cursorColor : 'black',
	cursorWidth : 1,
	selectionColor : '#338fff',
	selectionFontColor : 'white',
};

EditBox.prototype.inside = function (x, y)
{
	return (x >= this.x && x < (this.x + this.width) && y >= this.y && y < (this.y + this.height))
}

EditBox.prototype.setAlign = function (ctx, align)
{
	if (align == EditBox.LeftAlign)
	{
		this.scrollX = 0;
		this.align = align;
	}
	if (align == EditBox.RightAlign)
	{
		ctx.font = this.style.fontSize + 'px ' + this.style.font;
		this.scrollX = -this.width + ctx.measureText(this.text).width + 2*this.style.padding;
		this.align = align;
	}
}

EditBox.prototype.draw = function (ctx)
{
	ctx.save();
	// clip
	ctx.beginPath();
	ctx.rect(this.x, this.y, this.width, this.height);
	ctx.clip();
	// draw background
	ctx.fillStyle = this.style.background;
	ctx.fill();
	// draw text
	var contentX = this.x - this.scrollX + this.style.padding;
	var contentY = this.y - this.scrollY + this.style.padding;
	ctx.fillStyle = this.style.fontColor;
	ctx.font = this.style.fontSize + 'px ' + this.style.font;
	ctx.textBaseline = 'top';
	ctx.fillText(this.text, contentX, contentY);
	// draw cursor or selection
	if (this.focus)
	{
		if (this.hasSelection)
		{
			ctx.save();
			ctx.beginPath();
			var selectionStart, selectionEnd;
			if (this.cursor < this.selectionPivot)
			{
				selectionStart = this.cursor;
				selectionEnd = this.selectionPivot;
			}
			else
			{
				selectionStart = this.selectionPivot;
				selectionEnd = this.cursor;
			}
			var selectionX = ctx.measureText(this.text.substr(0, selectionStart)).width;
			var selectionY = contentY;
			var selectionWidth = ctx.measureText(this.text.substr(0, selectionEnd)).width - selectionX;
			var selectionHeight = this.style.fontSize;
			selectionX += contentX;
			ctx.rect(selectionX, selectionY, selectionWidth, selectionHeight);
			ctx.clip();
			ctx.fillStyle = this.style.selectionColor;
			ctx.fill();
			ctx.fillStyle = this.style.selectionFontColor;
			ctx.fillText(this.text, contentX, contentY);
			ctx.restore();
		}
		else
		{
			if (!this.blink)
			{
				var cx = ctx.measureText(this.text.substr(0, this.cursor)).width + contentX;
				var cy = Math.round(contentY);
				cx = Math.round(cx) + 0.5;
				ctx.beginPath();
				ctx.moveTo(cx, cy);
				ctx.lineTo(cx, cy + this.style.fontSize);
				ctx.strokeStyle = this.style.cursorColor;
				ctx.lineWidth = this.style.cursorWidth;
				ctx.stroke();
			}
		}
	}
	// draw border
	if (this.style.focusBorder && this.focus)
	{
		ctx.beginPath();
		ctx.rect(this.x + 0.5, this.y + 0.5, this.width - 1, this.height - 1);
		ctx.strokeStyle = this.style.focusBorder.color;
		ctx.lineWidth = this.style.focusBorder.width;
		ctx.stroke();
	}
	else if (this.style.border)
	{
		ctx.beginPath();
		ctx.rect(this.x + 0.5, this.y + 0.5, this.width - 1, this.height - 1);
		ctx.strokeStyle = this.style.border.color;
		ctx.lineWidth = this.style.border.width;
		ctx.stroke();
	}
	ctx.restore();
};

EditBox.prototype.updateCursor = function (ctx, shiftKey)
{
	ctx.font = this.style.fontSize + 'px ' + this.style.font;
	var cx = ctx.measureText(this.text.substr(0, this.cursor)).width - this.scrollX;
	if (cx < 0)
	{
		this.scrollX += cx;
	}
	var width = this.width - 2*this.style.padding;
	if (cx > width)
	{
		this.scrollX += cx - width;
	}

	if (this.align == EditBox.RightAlign)
	{
		var end = ctx.measureText(this.text).width - this.scrollX;
		if (end < width)
		{
			this.scrollX += end - width;
		}
	}

	if (shiftKey && this.cursor != this.selectionPivot)
	{
		this.hasSelection = true;
	}
	else
	{
		this.hasSelection = false;
		this.selectionPivot = this.cursor;
	}
}

EditBox.prototype.getSelection = function ()
{
	if (!this.hasSelection)
	{
		return '';
	}
	var selectionStart, selectionEnd;
	if (this.cursor < this.selectionPivot)
	{
		selectionStart = this.cursor;
		selectionEnd = this.selectionPivot;
	}
	else
	{
		selectionStart = this.selectionPivot;
		selectionEnd = this.cursor;
	}
	return this.text.substr(selectionStart, selectionEnd-selectionStart);
}

EditBox.prototype.deleteSelection = function (ctx)
{
	if (this.hasSelection)
	{
		var selectionStart, selectionEnd;
		if (this.cursor < this.selectionPivot)
		{
			selectionStart = this.cursor;
			selectionEnd = this.selectionPivot;
		}
		else
		{
			selectionStart = this.selectionPivot;
			selectionEnd = this.cursor;
		}
		this.cursor = selectionStart;
		this.selectionPivot = this.cursor;
		this.text = this.text.substr(0, selectionStart) + this.text.substr(selectionEnd);
	}
}

EditBox.prototype.cutSelection = function (ctx)
{
	if (!this.hasSelection)
	{
		return '';
	}
	var selectionStart, selectionEnd;
	if (this.cursor < this.selectionPivot)
	{
		selectionStart = this.cursor;
		selectionEnd = this.selectionPivot;
	}
	else
	{
		selectionStart = this.selectionPivot;
		selectionEnd = this.cursor;
	}
	var selection = this.text.substr(selectionStart, selectionEnd-selectionStart);
	this.cursor = selectionStart;
	this.selectionPivot = this.cursor;
	this.text = this.text.substr(0, selectionStart) + this.text.substr(selectionEnd);
	this.updateCursor(ctx, false);
	return selection;
}

EditBox.prototype.paste = function (ctx, text)
{
	if (this.hasSelection)
	{
		var selectionStart, selectionEnd;
		if (this.cursor < this.selectionPivot)
		{
			selectionStart = this.cursor;
			selectionEnd = this.selectionPivot;
		}
		else
		{
			selectionStart = this.selectionPivot;
			selectionEnd = this.cursor;
		}
		var selection = this.text.substr(selectionStart, selectionEnd-selectionStart);
		this.cursor = selectionStart;
		this.selectionPivot = this.cursor;
		this.text = this.text.substr(0, selectionStart) + this.text.substr(selectionEnd);
	}

	this.text = this.text.substr(0, this.cursor) + text + this.text.substr(this.cursor);
	this.cursor += text.length;
	this.updateCursor(ctx, false);
}

EditBox.prototype.onmousedown = function (ctx, x, y, shiftKey)
{
	x -= this.style.padding - this.scrollX;
	y -= this.style.padding - this.scrollY;
	ctx.font = this.style.fontSize + 'px ' + this.style.font;
	var left = 0;
	var right = 0;
	var i = 0;
	while (x > right && i < this.text.length)
	{
		i++;
		left = right;
		right = ctx.measureText(this.text.substr(0, i)).width;
	}
	if (Math.abs(right - x) <= Math.abs(left - x))
	{
		this.cursor = i;
	}
	else
	{
		this.cursor = i - 1;
	}
	this.updateCursor(ctx, shiftKey);
	return true;
};

EditBox.prototype.onmousemove = function (ctx, x, y)
{
	x -= this.style.padding - this.scrollX;
	y -= this.style.padding - this.scrollY;
	ctx.font = this.style.fontSize + 'px ' + this.style.font;
	var left = 0;
	var right = 0;
	var i = 0;
	while (x > right && i < this.text.length)
	{
		i++;
		left = right;
		right = ctx.measureText(this.text.substr(0, i)).width;
	}
	if (Math.abs(right - x) <= Math.abs(left - x))
	{
		this.cursor = i;
	}
	else
	{
		this.cursor = i - 1;
	}
	this.updateCursor(ctx, true);
};

// undo
// redo

EditBox.prototype.onkeydown = function (ctx, key, shiftKey, ctrlKey, altKey)
{
	switch(key)
	{
	case KEY_LEFT:
		this.cursor = (this.cursor > 0)? this.cursor-1: 0;
		break;
	case KEY_RIGHT:
		this.cursor = (this.cursor <= this.text.length)? this.cursor+1: this.text.length;
		break;
	case KEY_HOME:
		this.cursor = 0;
		break;
	case KEY_END:
		this.cursor = this.text.length;
		break;
	case KEY_BACKSPACE:
		if (this.hasSelection)
		{
			this.deleteSelection();
		}
		else if (this.cursor != 0)
		{
			this.cursor--;
			this.text = this.text.substr(0, this.cursor) + this.text.substr(this.cursor+1);
		}
		break;
	case KEY_DELETE:
		if (this.hasSelection)
		{
			this.deleteSelection();
		}
		else if (this.cursor < this.text.length)
		{
			this.text = this.text.substr(0, this.cursor) + this.text.substr(this.cursor+1);
		}
		break;
	default:
		return;
	}
	this.updateCursor(ctx, shiftKey);
};

EditBox.prototype.onkeypress = function (ctx, charCode)
{
	var c = String.fromCharCode(charCode);
	if (this.numeric && c!='.' && (isNaN(c) || c ==' '))
	{
		return;
	}
	this.deleteSelection();
	if (this.align == EditBox.RightAlign)
	{
		var width = ctx.measureText(this.text).width;
		this.text = this.text.substr(0, this.cursor) + c + this.text.substr(this.cursor);
		var newWidth = ctx.measureText(this.text).width;
		this.scrollX += newWidth - width;
	}
	else
	{
		this.text = this.text.substr(0, this.cursor) + c + this.text.substr(this.cursor);
	}
	this.cursor++;
	this.updateCursor(ctx, false);
}
