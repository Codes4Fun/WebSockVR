// Copyright (c) 2015 Codes4Fun
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include "mongoose.h"

#include <sixense.h>

#define BUFFER_SIZE (8*1024) 
static char * s_buffer = NULL;

int printControllers(char * buffer)
{
	int base, cont;
	sixenseAllControllerData acd;
	int count = 0;
	int maxBases = sixenseGetMaxBases();

	count += sprintf(buffer + count, "[");

	for( base=0; base<maxBases; base++ )
	{
		sixenseSetActiveBase(base);
		sixenseGetAllNewestData( &acd );
		if (base == 0)
		{
			count += sprintf(buffer + count, "[");
		}
		else
		{
			count += sprintf(buffer + count, ",[");
		}
		for( cont=0; cont<sixenseGetMaxControllers(); cont++ )
		{
			if (cont == 0)
			{
				count += sprintf(buffer + count, "{");
			}
			else
			{
				count += sprintf(buffer + count, ",{");
			}
			if( sixenseIsControllerEnabled( cont ) )
			{
				count += sprintf(buffer + count, "\"pos\" : [%f, %f, %f],",
					acd.controllers[cont].pos[0], acd.controllers[cont].pos[1], acd.controllers[cont].pos[2]);
				count += sprintf(buffer + count, "\"rot_mat\" : [%f, %f, %f, %f, %f, %f, %f, %f, %f],",
					acd.controllers[cont].rot_mat[0][0], acd.controllers[cont].rot_mat[0][1], acd.controllers[cont].rot_mat[0][2],
					acd.controllers[cont].rot_mat[1][0], acd.controllers[cont].rot_mat[1][1], acd.controllers[cont].rot_mat[1][2],
					acd.controllers[cont].rot_mat[2][0], acd.controllers[cont].rot_mat[2][1], acd.controllers[cont].rot_mat[2][2] );
				count += sprintf(buffer + count, "\"joystick_x\" : %f,", acd.controllers[cont].joystick_x);
				count += sprintf(buffer + count, "\"joystick_y\" : %f,", acd.controllers[cont].joystick_y);
				count += sprintf(buffer + count, "\"trigger\" : %f,", acd.controllers[cont].trigger);
				count += sprintf(buffer + count, "\"buttons\" : %d,", acd.controllers[cont].buttons);
				count += sprintf(buffer + count, "\"rot_quat\" : [%f, %f, %f, %f],",
					acd.controllers[cont].rot_quat[0],
					acd.controllers[cont].rot_quat[1],
					acd.controllers[cont].rot_quat[2],
					acd.controllers[cont].rot_quat[3]);
				count += sprintf(buffer + count, "\"is_docked\" : %d,", acd.controllers[cont].is_docked);
				count += sprintf(buffer + count, "\"which_hand\" : %d", acd.controllers[cont].which_hand);
			}
			count += sprintf(buffer + count, "}");
		}
		count += sprintf(buffer + count, "]");
	}

	count += sprintf(buffer + count, "]");
	//printf("size = %d\n", count);
	return count;
}

static void websocket_ready_handler(struct mg_connection *conn)
{
	mg_websocket_write(conn, WEBSOCKET_OPCODE_TEXT, s_buffer, printControllers(s_buffer));
}

static int websocket_data_handler(struct mg_connection *conn, int flags, char *data, size_t data_len)
{
	(void) flags;
	(void) data;
	(void) data_len;
	mg_websocket_write(conn, WEBSOCKET_OPCODE_TEXT, s_buffer, printControllers(s_buffer));

	return 1;
}

int main(void)
{
	struct mg_context *ctx;
	struct mg_callbacks callbacks;
	const char *options[] =
	{
		"listening_ports", "6438",
		"document_root", "root",
		NULL
	};

	// initialization
	sixenseInit();
	s_buffer = (char*)malloc(BUFFER_SIZE);
	memset(&callbacks, 0, sizeof(callbacks));
	callbacks.websocket_ready = websocket_ready_handler;
	callbacks.websocket_data = websocket_data_handler;
	ctx = mg_start(&callbacks, NULL, options);

	// wait for keypress
	printf("listening port: 6438\npress enter to exit\n\n");
	getchar();

	// exit
	mg_stop(ctx);
	free(s_buffer);
	sixenseExit();

	return 0;
}
