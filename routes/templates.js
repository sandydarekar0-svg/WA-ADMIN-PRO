router.put('/:id', async (req, res) => {
    try {
        const { name, content, category } = req.body;
        const updatedTemplate = await Template.findByIdAndUpdate(
            req.params.id, 
            { name, content, category },
            { new: true } // Returns the updated document
        );
        res.json(updatedTemplate);
    } catch (err) {
        res.status(500).send("Error updating template");
    }
});
