/*
 * Fournit les deux fonctions que le noyau Meraki 3.18.131 exporte
 * et dont elts_meraki.ko a besoin. Elles ne font que mémoriser
 * les fonctions de rappel enregistrées.
 */
#include <linux/module.h>
#include <linux/kernel.h>

static void *assoc_cbs;

int register_click_association_table_cbs(void *cbs)
{
	assoc_cbs = cbs;
	pr_info("assoc_stub: callbacks enregistrés (%p)\n", cbs);
	return 0;
}
EXPORT_SYMBOL(register_click_association_table_cbs);

int unregister_click_association_table_cbs(void *cbs)
{
	assoc_cbs = NULL;
	pr_info("assoc_stub: callbacks retirés\n");
	return 0;
}
EXPORT_SYMBOL(unregister_click_association_table_cbs);

MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("Stub des callbacks de table d'association Meraki");
