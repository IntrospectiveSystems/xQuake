#include <stdio.h>
#include <string.h>
#include "GenXTT.h"

int main(int argc, char* argv[]) {
	GenXTT *xtt;

	printf("This works\n");
	printf("%d\n", argc);
	for (int i = 0; i < argc; i++)
		printf("%d %s\n", i, argv[i]);
	char buf[1000];
	FILE *fp = fopen("Branch.json", "rt");
	fread(buf, 1000, 1, fp);
	fclose(fp);

	xtt = new GenXTT();
	xtt->Generate(buf);
	delete xtt;
	return 0;
}
