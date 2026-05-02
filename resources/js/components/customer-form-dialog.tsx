import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type DocumentType = 'cpf' | 'cnpj';

export interface CustomerFormData {
    id?: number;
    name: string;
    phone: string | null;
    email: string | null;
    customer_document_type: DocumentType;
    customer_document: string;
    zip_code: string | null;
    state: string | null;
    city: string | null;
    neighborhood: string | null;
    street: string | null;
    address_number: string | null;
    address_complement: string | null;
    address_reference: string | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer?: CustomerFormData | null;
}

const emptyForm = {
    name: '',
    phone: '',
    email: '',
    customer_document_type: 'cpf' as DocumentType,
    customer_document: '',
    zip_code: '',
    state: '',
    city: '',
    neighborhood: '',
    street: '',
    address_number: '',
    address_complement: '',
    address_reference: '',
};

const onlyDigits = (value: string) => value.replace(/\D/g, '');

export function CustomerFormDialog({ open, onOpenChange, customer }: Props) {
    const isEditing = Boolean(customer);
    const form = useForm(emptyForm);

    useEffect(() => {
        if (!open) {
            return;
        }

        form.clearErrors();

        if (customer) {
            form.setData({
                name: customer.name,
                phone: customer.phone ?? '',
                email: customer.email ?? '',
                customer_document_type: customer.customer_document_type,
                customer_document: customer.customer_document,
                zip_code: customer.zip_code ?? '',
                state: customer.state ?? '',
                city: customer.city ?? '',
                neighborhood: customer.neighborhood ?? '',
                street: customer.street ?? '',
                address_number: customer.address_number ?? '',
                address_complement: customer.address_complement ?? '',
                address_reference: customer.address_reference ?? '',
            });
        } else {
            form.setData(emptyForm);
        }
    }, [open, customer]);

    const submit = (event: FormEvent) => {
        event.preventDefault();

        const payload = {
            ...form.data,
            customer_document: onlyDigits(form.data.customer_document),
            zip_code: onlyDigits(form.data.zip_code),
        };

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onOpenChange(false);
            },
        };

        form.transform(() => payload);

        if (customer) {
            form.put(`/manufacturer/customers/${customer.id}`, options);
        } else {
            form.post('/manufacturer/customers', options);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Editar cliente' : 'Cadastrar cliente'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Atualize os dados cadastrais do cliente.'
                            : 'Cadastre manualmente um cliente para este fabricante.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="customer-name">Nome *</Label>
                            <Input
                                id="customer-name"
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                            />
                            <InputError message={form.errors.name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="customer-document-type">
                                Tipo *
                            </Label>
                            <Select
                                value={form.data.customer_document_type}
                                onValueChange={(value) =>
                                    form.setData(
                                        'customer_document_type',
                                        value as DocumentType,
                                    )
                                }
                            >
                                <SelectTrigger id="customer-document-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cpf">
                                        Pessoa física
                                    </SelectItem>
                                    <SelectItem value="cnpj">
                                        Pessoa jurídica
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError
                                message={form.errors.customer_document_type}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="customer-document">
                                {form.data.customer_document_type === 'cnpj'
                                    ? 'CNPJ *'
                                    : 'CPF *'}
                            </Label>
                            <Input
                                id="customer-document"
                                value={form.data.customer_document}
                                onChange={(event) =>
                                    form.setData(
                                        'customer_document',
                                        event.target.value,
                                    )
                                }
                            />
                            <InputError
                                message={form.errors.customer_document}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="customer-phone">Telefone</Label>
                            <Input
                                id="customer-phone"
                                value={form.data.phone}
                                onChange={(event) =>
                                    form.setData('phone', event.target.value)
                                }
                            />
                            <InputError message={form.errors.phone} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="customer-email">E-mail</Label>
                            <Input
                                id="customer-email"
                                type="email"
                                value={form.data.email}
                                onChange={(event) =>
                                    form.setData('email', event.target.value)
                                }
                            />
                            <InputError message={form.errors.email} />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-6">
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="customer-zip-code">CEP</Label>
                            <Input
                                id="customer-zip-code"
                                value={form.data.zip_code}
                                onChange={(event) =>
                                    form.setData('zip_code', event.target.value)
                                }
                            />
                            <InputError message={form.errors.zip_code} />
                        </div>

                        <div className="space-y-2 sm:col-span-1">
                            <Label htmlFor="customer-state">UF</Label>
                            <Input
                                id="customer-state"
                                maxLength={2}
                                value={form.data.state}
                                onChange={(event) =>
                                    form.setData(
                                        'state',
                                        event.target.value.toUpperCase(),
                                    )
                                }
                            />
                            <InputError message={form.errors.state} />
                        </div>

                        <div className="space-y-2 sm:col-span-3">
                            <Label htmlFor="customer-city">Cidade</Label>
                            <Input
                                id="customer-city"
                                value={form.data.city}
                                onChange={(event) =>
                                    form.setData('city', event.target.value)
                                }
                            />
                            <InputError message={form.errors.city} />
                        </div>

                        <div className="space-y-2 sm:col-span-3">
                            <Label htmlFor="customer-neighborhood">
                                Bairro
                            </Label>
                            <Input
                                id="customer-neighborhood"
                                value={form.data.neighborhood}
                                onChange={(event) =>
                                    form.setData(
                                        'neighborhood',
                                        event.target.value,
                                    )
                                }
                            />
                            <InputError message={form.errors.neighborhood} />
                        </div>

                        <div className="space-y-2 sm:col-span-3">
                            <Label htmlFor="customer-street">Rua</Label>
                            <Input
                                id="customer-street"
                                value={form.data.street}
                                onChange={(event) =>
                                    form.setData('street', event.target.value)
                                }
                            />
                            <InputError message={form.errors.street} />
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="customer-address-number">
                                Número
                            </Label>
                            <Input
                                id="customer-address-number"
                                value={form.data.address_number}
                                onChange={(event) =>
                                    form.setData(
                                        'address_number',
                                        event.target.value,
                                    )
                                }
                            />
                            <InputError message={form.errors.address_number} />
                        </div>

                        <div className="space-y-2 sm:col-span-4">
                            <Label htmlFor="customer-address-complement">
                                Complemento
                            </Label>
                            <Input
                                id="customer-address-complement"
                                value={form.data.address_complement}
                                onChange={(event) =>
                                    form.setData(
                                        'address_complement',
                                        event.target.value,
                                    )
                                }
                            />
                            <InputError
                                message={form.errors.address_complement}
                            />
                        </div>

                        <div className="space-y-2 sm:col-span-6">
                            <Label htmlFor="customer-address-reference">
                                Referência
                            </Label>
                            <Input
                                id="customer-address-reference"
                                value={form.data.address_reference}
                                onChange={(event) =>
                                    form.setData(
                                        'address_reference',
                                        event.target.value,
                                    )
                                }
                            />
                            <InputError
                                message={form.errors.address_reference}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {isEditing ? 'Salvar cliente' : 'Criar cliente'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
